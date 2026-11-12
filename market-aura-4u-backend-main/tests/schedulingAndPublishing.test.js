const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { beforeEach, afterEach, test, mock } = require('node:test');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const MediaAsset = require('../src/models/MediaAsset');
const ScheduledPost = require('../src/models/ScheduledPost');
const { UPLOADS_ROOT } = require('../src/controllers/media/mediaController');
const { publish: publishEmail } = require('../src/services/publishers/emailPublisher');
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

test('createPost trims valid whitespace-padded jobId and rejects malformed jobId clearly', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const validJobId = '507f1f77bcf86cd799439012';
  mock.method(User, 'findById', async () => ({ _id: userId, timezone: 'UTC' }));

  const badRes = mockRes();
  await createPost({
    user: { id: userId },
    body: {
      mode: 'now',
      sourceType: 'ai_generated',
      jobId: 'legacy-0',
      platforms: ['email'],
    },
  }, badRes);
  assert.equal(badRes.statusCode, 400);
  assert.match(badRes.body.message, /Invalid content job ID/i);

  mock.method(Job, 'findOne', async ({ _id }) => {
    assert.equal(_id, validJobId);
    return {
      _id: validJobId,
      userId,
      status: 'completed',
      originalContent: 'Weekly travel digest',
      generatedContent: new Map([
        ['email', { subject: 'Digest', body: 'Travel body' }],
      ]),
    };
  });
  mock.method(ScheduledPost, 'create', async (doc) => ({
    ...doc,
    _id: '607f1f77bcf86cd799439099',
    async save() { return this; },
  }));

  const okRes = mockRes();
  await createPost({
    user: { id: userId },
    body: {
      mode: 'custom',
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
      jobId: `  ${validJobId}  `,
      platforms: ['email'],
    },
  }, okRes);
  assert.equal(okRes.statusCode, 201);
  assert.equal(okRes.body.success, true);
});

test('emailPublisher attaches local mp4 video and remote inline image for Resend without leaking localhost links', async () => {
  const userId = '507f1f77bcf86cd799439055';
  const uploadDir = path.join(UPLOADS_ROOT, userId);
  const videoName = '11111111-1111-4111-8111-111111111111.mp4';
  const videoPath = path.join(uploadDir, videoName);
  const sampleMp4 = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(videoPath, sampleMp4);

  try {
    let sentResendBody = null;
    mock.method(globalThis, 'fetch', async (url, init) => {
      if (String(url) === 'https://cdn.example.com/hero.png') {
        return new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }
      if (String(url) === 'https://api.resend.com/emails') {
        sentResendBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const localUrl = `http://localhost:8000/uploads/media/${userId}/${videoName}`;
    const result = await publishEmail({
      user: {
        socialAccounts: {
          email: {
            isConnected: true,
            provider: 'resend',
            fromEmail: 'hello@example.com',
            defaultRecipients: ['reader@example.com'],
            secretEnc: encryptSecret('re_test_key'),
          },
        },
      },
      content: { subject: 'Video Update', body: 'Check out <demo> clip!' },
      mediaUrls: [localUrl, localUrl, 'https://cdn.example.com/hero.png'],
    });

    assert.equal(result.externalPostId, 'email_123');
    assert.equal(sentResendBody.attachments.length, 2);
    assert.deepEqual(sentResendBody.attachments[0], {
      filename: videoName,
      content: sampleMp4.toString('base64'),
      contentType: 'video/mp4',
    });
    assert.equal(sentResendBody.attachments[1].filename, 'hero.png');
    assert.equal(sentResendBody.attachments[1].contentType, 'image/png');
    assert.equal(sentResendBody.attachments[1].contentId, 'media-2');
    assert.match(sentResendBody.html, /&lt;demo&gt;/);
    assert.match(sentResendBody.html, /cid:media-2/);
    assert.doesNotMatch(sentResendBody.html, /localhost/);
    assert.doesNotMatch(sentResendBody.text, /localhost/);
    assert.match(sentResendBody.text, new RegExp(videoName));
  } finally {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
});

test('emailPublisher attaches video and disambiguates duplicate filenames for SendGrid and Webhook', async () => {
  const sampleVideo = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
  let sendgridPayload = null;
  let webhookPayload = null;

  mock.method(globalThis, 'fetch', async (url, init) => {
    if (String(url).startsWith('https://cdn.example.com/')) {
      return new Response(sampleVideo, {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      });
    }
    if (String(url) === 'https://api.sendgrid.com/v3/mail/send') {
      sendgridPayload = JSON.parse(init.body);
      return new Response('', { status: 202 });
    }
    if (String(url) === 'https://hooks.example.com/email') {
      webhookPayload = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: 'wh_1' }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });

  await publishEmail({
    user: {
      socialAccounts: {
        email: {
          isConnected: true,
          provider: 'sendgrid',
          fromEmail: 'hello@example.com',
          defaultRecipients: ['a@example.com'],
          secretEnc: encryptSecret('SG.test'),
        },
      },
    },
    content: { subject: 'Two Videos', body: 'Watch both clips.' },
    mediaUrls: ['https://cdn.example.com/a/clip.mp4', 'https://cdn.example.com/b/clip.mp4'],
  });

  assert.equal(sendgridPayload.attachments.length, 2);
  assert.equal(sendgridPayload.attachments[0].filename, 'clip.mp4');
  assert.equal(sendgridPayload.attachments[0].type, 'video/mp4');
  assert.equal(sendgridPayload.attachments[0].disposition, 'attachment');
  assert.equal(sendgridPayload.attachments[1].filename, 'clip-2.mp4');
  assert.match(sendgridPayload.content[1].value, /https:\/\/cdn\.example\.com\/a\/clip\.mp4/);

  await publishEmail({
    user: {
      socialAccounts: {
        email: {
          isConnected: true,
          provider: 'webhook',
          fromEmail: 'hello@example.com',
          defaultRecipients: ['a@example.com'],
          webhookUrl: 'https://hooks.example.com/email',
        },
      },
    },
    content: { subject: 'Webhook Video', body: 'Attached.' },
    mediaUrls: ['https://cdn.example.com/a/clip.mp4'],
  });

  assert.equal(webhookPayload.mediaUrls.length, 1);
  assert.equal(webhookPayload.attachments[0].filename, 'clip.mp4');
  assert.equal(webhookPayload.attachments[0].contentType, 'video/mp4');
});

test('emailPublisher fails clearly when local upload is missing or attachments exceed SendGrid size limit', async () => {
  await assert.rejects(
    () => publishEmail({
      user: {
        socialAccounts: {
          email: {
            isConnected: true,
            provider: 'resend',
            fromEmail: 'hello@example.com',
            defaultRecipients: ['a@example.com'],
            secretEnc: encryptSecret('re_test_key'),
          },
        },
      },
      content: { subject: 'Missing', body: 'Video body' },
      mediaUrls: ['http://localhost:8000/uploads/media/507f1f77bcf86cd799439011/22222222-2222-4222-8222-222222222222.mp4'],
    }),
    (err) => err.code === 'INVALID_MEDIA' && err.retryable === false && /not found/i.test(err.message),
  );

  const bigChunk = Buffer.alloc(9 * 1024 * 1024, 0x41);
  mock.method(globalThis, 'fetch', async () => new Response(bigChunk, {
    status: 200,
    headers: { 'content-type': 'video/mp4' },
  }));

  await assert.rejects(
    () => publishEmail({
      user: {
        socialAccounts: {
          email: {
            isConnected: true,
            provider: 'sendgrid',
            fromEmail: 'hello@example.com',
            defaultRecipients: ['a@example.com'],
            secretEnc: encryptSecret('SG.test'),
          },
        },
      },
      content: { subject: 'Too Big', body: 'Three large clips' },
      mediaUrls: [
        'https://cdn.example.com/1.mp4',
        'https://cdn.example.com/2.mp4',
        'https://cdn.example.com/3.mp4',
      ],
    }),
    (err) => err.code === 'INVALID_MEDIA' && err.retryable === false && /size limit/i.test(err.message),
  );
});
