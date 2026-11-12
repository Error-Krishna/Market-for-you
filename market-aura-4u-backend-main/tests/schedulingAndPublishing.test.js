const assert = require('node:assert/strict');
const { beforeEach, afterEach, test, mock } = require('node:test');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const MediaAsset = require('../src/models/MediaAsset');
const ScheduledPost = require('../src/models/ScheduledPost');
const { encryptSecret, decryptSecret } = require('../src/utils/tokenCrypto');
const { computeNextRecommendedDate } = require('../src/utils/recommendedTime');
const { createPost, publishPostNow } = require('../src/controllers/content/scheduleController');
const { executePostDelivery, summarizeOverallStatus } = require('../src/services/schedulerService');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

beforeEach(() => {
  mock.restoreAll();
});

afterEach(() => {
  mock.restoreAll();
});

test('encryptSecret / decryptSecret roundtrip protects OAuth tokens', () => {
  const token = 'oauth-secret-token-value-12345';
  const encrypted = encryptSecret(token);
  assert.notEqual(encrypted, token);
  assert.equal(encrypted.includes(token), false);
  assert.equal(decryptSecret(encrypted), token);
  assert.equal(decryptSecret('tampered.payload.value'), null);
});

test('computeNextRecommendedDate resolves next matching UTC day and start time', () => {
  // 2026-11-12 is a Thursday at 10:00 UTC.
  const now = new Date('2026-11-12T10:00:00Z');
  // Window Thursday 06:00 already passed -> next Thursday 2026-11-19 06:00 UTC
  const nextThu = computeNextRecommendedDate({ day: 'Thursday', start: '06:00', end: '07:00', timezone: 'UTC' }, now);
  assert.equal(nextThu.toISOString(), '2026-11-19T06:00:00.000Z');

  // Window Friday 14:30 is tomorrow -> 2026-11-13 14:30 UTC
  const nextFri = computeNextRecommendedDate({ day: 'Friday', start: '14:30', end: '15:30', timezone: 'UTC' }, now);
  assert.equal(nextFri.toISOString(), '2026-11-13T14:30:00.000Z');
});

test('createPost schedules AI content at ML recommended posting time', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const jobId = '507f1f77bcf86cd799439012';

  mock.method(User, 'findById', async () => ({ _id: userId, timezone: 'Asia/Kolkata' }));
  mock.method(Job, 'findOne', async () => ({
    _id: jobId,
    userId,
    status: 'completed',
    originalContent: 'Launch natural glow serum',
    generatedContent: new Map([
      ['twitter', [{ text: 'Glow naturally! #skincare' }]],
      ['linkedin', ['Introducing our clean skincare serum.']],
      ['grounding', {
        isGrounded: true,
        recommendation: {
          recommended_posting_time: { day: 'Saturday', start: '14:00', end: '15:00', timezone: 'UTC' },
        },
      }],
    ]),
  }));

  let savedDoc = null;
  mock.method(ScheduledPost, 'create', async (doc) => {
    savedDoc = { ...doc, _id: '607f1f77bcf86cd799439099' };
    return savedDoc;
  });

  const res = mockRes();
  await createPost({
    user: { id: userId },
    body: {
      mode: 'recommended',
      jobId,
      platforms: ['twitter', 'linkedin'],
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(savedDoc.recommendedTimeUsed, true);
  assert.equal(savedDoc.status, 'scheduled');
  assert.equal(savedDoc.platforms.length, 2);
  assert.equal(savedDoc.scheduledAt.getUTCDay(), 6); // Saturday
  assert.equal(savedDoc.scheduledAt.getUTCHours(), 14);
});

test('executePostDelivery isolates partial platform failures and schedules retry for transient errors', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const user = {
    _id: userId,
    socialAccounts: {
      twitter: {
        isConnected: true,
        accessTokenEnc: encryptSecret('valid-tw-token'),
        expiresAt: new Date(Date.now() + 3600_000),
      },
      linkedin: {
        isConnected: true,
        memberUrn: 'urn:li:person:abc123',
        accessTokenEnc: encryptSecret('valid-li-token'),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    },
  };

  mock.method(globalThis, 'fetch', async (url) => {
    const href = String(url);
    if (href.includes('api.twitter.com/2/tweets')) {
      return new Response(JSON.stringify({ data: { id: 'tweet_999' } }), { status: 201 });
    }
    if (href.includes('api.linkedin.com/rest/posts')) {
      return new Response(JSON.stringify({ message: 'Rate limit exceeded' }), { status: 429 });
    }
    throw new Error(`Unexpected fetch URL: ${href}`);
  });

  const post = {
    _id: '607f1f77bcf86cd799439088',
    userId,
    title: 'Multi-platform broadcast',
    status: 'processing',
    retryCount: 0,
    maxRetries: 3,
    platforms: [
      { platform: 'twitter', content: [{ text: 'Hello X!' }], mediaAssetIds: [], mediaUrls: [], status: 'pending', attempts: 0 },
      { platform: 'linkedin', content: ['Hello LinkedIn!'], mediaAssetIds: [], mediaUrls: [], status: 'pending', attempts: 0 },
    ],
    async save() { return this; },
  };

  await executePostDelivery(post, user, { onlyStatuses: ['pending'] });

  assert.equal(post.status, 'partial');
  assert.equal(post.platforms[0].status, 'published');
  assert.equal(post.platforms[0].externalPostId, 'tweet_999');
  assert.equal(post.platforms[0].externalPostUrl, 'https://x.com/i/web/status/tweet_999');

  assert.equal(post.platforms[1].status, 'failed');
  assert.equal(post.platforms[1].retryable, true);
  assert.equal(post.retryCount, 1);
  assert.ok(post.nextRetryAt instanceof Date);
});

test('createPost supports manual_broadcast with attached MediaAsset and immediate delivery', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const mediaId = '607f1f77bcf86cd799439055';

  mock.method(User, 'findById', async () => ({
    _id: userId,
    timezone: 'UTC',
    socialAccounts: {
      blog: {
        isConnected: true,
        provider: 'webhook',
        siteUrl: 'https://hooks.example.com/blog',
      },
      instagram: { isConnected: false },
    },
  }));

  mock.method(MediaAsset, 'find', () => ({
    select: async () => [{ _id: mediaId, url: 'https://cdn.example.com/hero.jpg' }],
  }));

  mock.method(globalThis, 'fetch', async (url) => {
    if (String(url) === 'https://hooks.example.com/blog') {
      return new Response(JSON.stringify({ id: 'post_42', url: 'https://blog.example.com/launch' }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });

  mock.method(ScheduledPost, 'create', async (doc) => ({
    ...doc,
    _id: '607f1f77bcf86cd799439077',
    async save() { return this; },
  }));

  const res = mockRes();
  await createPost({
    user: { id: userId },
    body: {
      mode: 'now',
      sourceType: 'manual_broadcast',
      title: 'Manual Product Launch',
      platforms: ['blog', 'instagram'],
      mediaAssetIds: [mediaId],
      sharedContent: {
        title: 'Product Launch',
        text: 'Our brand new release is live!',
      },
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true); // Partial success (blog succeeded, instagram not connected)
  assert.equal(res.body.post.status, 'partial');
  assert.equal(res.body.post.platforms[0].status, 'published');
  assert.equal(res.body.post.platforms[0].externalPostUrl, 'https://blog.example.com/launch');
  assert.equal(res.body.post.platforms[1].status, 'failed');
  assert.match(res.body.post.platforms[1].lastError, /not connected/i);
});

test('summarizeOverallStatus computes all summary states accurately', () => {
  assert.equal(summarizeOverallStatus([{ status: 'published' }]), 'published');
  assert.equal(summarizeOverallStatus([{ status: 'published' }, { status: 'failed' }]), 'partial');
  assert.equal(summarizeOverallStatus([{ status: 'failed' }]), 'failed');
  assert.equal(summarizeOverallStatus([{ status: 'cancelled' }]), 'cancelled');
  assert.equal(summarizeOverallStatus([{ status: 'pending' }, { status: 'published' }]), 'processing');
});

test('computeNextRecommendedDate handles abbreviated weekday string windows', () => {
  const monday = new Date('2026-11-09T08:00:00.000Z');
  const next = computeNextRecommendedDate('Tue 09:30-11:30 UTC', monday);
  assert.equal(next.toISOString(), '2026-11-10T09:30:00.000Z');
});

test('publishPostNow returns 409 when active lock is held by scheduler worker', async () => {
  mock.method(ScheduledPost, 'findOne', async () => ({
    _id: '607f1f77bcf86cd799439088',
    status: 'processing',
    lockUntil: new Date(Date.now() + 60_000),
  }));

  const res = mockRes();
  await publishPostNow({
    user: { id: '507f1f77bcf86cd799439011' },
    params: { id: '607f1f77bcf86cd799439088' },
  }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /already in progress/i);
});
