const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('node:path');
const { fork } = require('node:child_process');

const uri = process.env.MARKET_AURA_TEST_MONGO_URI;
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/market_aura_disposable_/.test(uri || '')) {
  throw new Error('A dedicated loopback MongoDB test URI is required');
}
process.env.JWT_SECREAT_KEY = 'offline-test-only-signing-secret';
let calls = 0;
let releaseDelivery;
let deliveryStarted;
let started;
let providerFailure = null;
function armDelivery() {
  started = new Promise((resolve) => { deliveryStarted = resolve; });
}
const publishers = require('../src/services/publishers');
publishers.publishToPlatform = async () => {
  calls += 1;
  deliveryStarted();
  await new Promise((resolve) => { releaseDelivery = resolve; });
  if (providerFailure) throw providerFailure;
  return { externalPostId: 'mock-only' };
};
const app = require('../src/app');
const User = require('../src/models/User');
const ScheduledPost = require('../src/models/ScheduledPost');
const { processDueScheduledPosts } = require('../src/services/schedulerService');
let server;
let base;
let owner;
let other;
let post;

before(async () => {
  await mongoose.connect(uri);
  owner = await User.create({ email: 'owner@example.invalid', password: 'test', onboardingCompleted: true });
  other = await User.create({ email: 'other@example.invalid', password: 'test', onboardingCompleted: true });
  post = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Test', scheduledAt: new Date(Date.now() + 3600000), platforms: [{ platform: 'email', content: 'Test' }] });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1/posts/${post.id}`;
});
after(async () => {
  if (releaseDelivery) releaseDelivery();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});
function token(user) { return jwt.sign({ email: user.email }, process.env.JWT_SECREAT_KEY); }

test('ownership and atomic publish prevent duplicate delivery', async () => {
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await fetch(base, { headers: { Authorization: `Bearer ${token(other)}` } })).status, 404);
  const headers = { Authorization: `Bearer ${token(owner)}` };
  assert.equal((await fetch(base, { headers })).status, 200);
  armDelivery();
  const first = fetch(`${base}/publish-now`, { method: 'POST', headers });
  await started;
  const second = await fetch(`${base}/publish-now`, { method: 'POST', headers });
  assert.equal(second.status, 409);
  releaseDelivery();
  assert.equal((await first).status, 200);
  assert.equal(calls, 1);
  assert.equal((await ScheduledPost.findById(post._id)).status, 'published');
});

test('scheduler claim blocks manual publishing and competing workers', async () => {
  const due = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Due', scheduledAt: new Date(Date.now() - 1000), platforms: [{ platform: 'email', content: 'Test' }] });
  armDelivery();
  const worker = processDueScheduledPosts();
  await started;
  const response = await fetch(`${base.replace(post.id, due.id)}/publish-now`, { method: 'POST', headers: { Authorization: `Bearer ${token(owner)}` } });
  assert.equal(response.status, 409);
  assert.equal(await processDueScheduledPosts(), 0);
  releaseDelivery();
  assert.equal(await worker, 1);
  assert.equal(calls, 2);
  assert.equal((await ScheduledPost.findById(due._id)).status, 'published');
});

test('concurrent retries issue a single provider call', async () => {
  const failed = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Retry', scheduledAt: new Date(), status: 'failed', platforms: [{ platform: 'email', content: 'Test', status: 'failed' }] });
  const url = `${base.replace(post.id, failed.id)}/retry`;
  const headers = { Authorization: `Bearer ${token(owner)}` };
  armDelivery();
  const first = fetch(url, { method: 'POST', headers });
  await started;
  assert.equal((await fetch(url, { method: 'POST', headers })).status, 409);
  releaseDelivery();
  assert.equal((await first).status, 200);
  assert.equal(calls, 3);
});

test('expired delivery is marked for review without sending or retrying', async () => {
  const interrupted = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Interrupted', scheduledAt: new Date(Date.now() - 10000), status: 'processing', lockUntil: new Date(Date.now() - 1000), lockedBy: 'dead-worker', platforms: [{ platform: 'email', content: 'Test' }] });
  const staleWorker = await ScheduledPost.findById(interrupted._id);
  assert.equal(await processDueScheduledPosts(), 0);
  const recovered = await ScheduledPost.findById(interrupted._id);
  assert.equal(recovered.status, 'failed');
  assert.equal(recovered.platforms[0].retryable, false);
  assert.match(recovered.platforms[0].lastError, /outcome unknown/i);
  assert.equal(recovered.nextRetryAt, null);
  staleWorker.status = 'published';
  await assert.rejects(staleWorker.save(), { name: 'VersionError' });
  assert.equal(calls, 3);
});

test('a scheduler claim fences edits and cancellation based on stale reads', async () => {
  for (const operation of ['edit', 'cancel']) {
    const due = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: operation, scheduledAt: new Date(Date.now() - 1000), platforms: [{ platform: 'email', content: 'Test' }] });
    const stale = await ScheduledPost.findById(due._id);
    armDelivery();
    const worker = processDueScheduledPosts();
    await started;
    if (operation === 'edit') stale.title = 'stale edit';
    else stale.status = 'cancelled';
    await assert.rejects(stale.save(), { name: 'VersionError' });
    releaseDelivery();
    await worker;
    assert.equal((await ScheduledPost.findById(due._id)).status, 'published');
  }
});

test('edit and cancel endpoints return conflict if scheduler claims after their read', async () => {
  for (const operation of ['edit', 'cancel']) {
    const due = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: operation, scheduledAt: new Date(Date.now() - 1000), platforms: [{ platform: 'email', content: 'Test' }] });
    const originalFindOne = ScheduledPost.findOne;
    let releaseRead;
    let signalRead;
    const readStarted = new Promise((resolve) => { signalRead = resolve; });
    ScheduledPost.findOne = async function (...args) {
      const result = await originalFindOne.apply(this, args);
      signalRead();
      await new Promise((resolve) => { releaseRead = resolve; });
      return result;
    };
    try {
      const url = base.replace(post.id, due.id) + (operation === 'cancel' ? '/cancel' : '');
      const request = fetch(url, { method: operation === 'cancel' ? 'POST' : 'PUT', headers: { Authorization: `Bearer ${token(owner)}`, 'Content-Type': 'application/json' }, body: operation === 'edit' ? JSON.stringify({ title: 'New title' }) : '{}' });
      await readStarted;
      armDelivery();
      const worker = processDueScheduledPosts();
      await started;
      releaseRead();
      assert.equal((await request).status, 409);
      releaseDelivery();
      await worker;
      ScheduledPost.findOne = originalFindOne;
      assert.equal((await ScheduledPost.findById(due._id)).status, 'published');
    } finally {
      ScheduledPost.findOne = originalFindOne;
    }
  }
});

for (const stage of ['claimed', 'provider_accepted', 'before_save']) {
  test(`process crash at ${stage} preserves unknown outcome without duplicate delivery`, async () => {
    const due = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: stage, scheduledAt: new Date(Date.now() - 1000), platforms: [{ platform: 'email', content: 'Test' }] });
    const child = fork(path.join(__dirname, 'fixtures', 'schedulerCrashWorker.js'), [], {
      env: { ...process.env, CRASH_STAGE: stage },
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let errorOutput = '';
    child.stderr.on('data', (chunk) => { errorOutput += chunk.toString(); });
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Crash worker did not reach the requested stage')), 15000);
        child.on('message', (message) => {
          if (message.stage === stage) { clearTimeout(timeout); resolve(); }
        });
        child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Worker exited early ${code}: ${errorOutput}`)); });
      });
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGKILL');
      await exited;
      const interrupted = await ScheduledPost.findById(due._id);
      assert.equal(interrupted.status, 'processing');
      await ScheduledPost.updateOne({ _id: due._id }, { $set: { lockUntil: new Date(Date.now() - 1) } });
      const countBefore = calls;
      assert.equal(await processDueScheduledPosts(), 0);
      const recovered = await ScheduledPost.findById(due._id);
      assert.equal(recovered.deliveryOutcomeUnknown, true);
      assert.equal(recovered.status, 'failed');
      assert.equal(recovered.nextRetryAt, null);
      assert.match(recovered.platforms[0].lastError, /outcome unknown/i);
      const headers = { Authorization: `Bearer ${token(owner)}`, 'Content-Type': 'application/json' };
      const url = base.replace(post.id, due.id);
      assert.equal((await fetch(`${url}/publish-now`, { method: 'POST', headers })).status, 409);
      assert.equal((await fetch(`${url}/retry`, { method: 'POST', headers })).status, 409);
      assert.equal((await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ title: 'retry' }) })).status, 409);
      assert.equal(await processDueScheduledPosts(), 0);
      assert.equal(calls, countBefore);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  });
}

test('a database save failure after delivery also requires review', async () => {
  const due = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Save failure', scheduledAt: new Date(Date.now() - 1000), platforms: [{ platform: 'email', content: 'Test' }] });
  const originalSave = ScheduledPost.prototype.save;
  armDelivery();
  try {
    const worker = processDueScheduledPosts();
    await started;
    ScheduledPost.prototype.save = async function () { throw new Error('Simulated post-delivery save failure'); };
    releaseDelivery();
    assert.equal(await worker, 1);
    const recovered = await ScheduledPost.findById(due._id);
    assert.equal(recovered.deliveryOutcomeUnknown, true);
    assert.equal(recovered.status, 'failed');
    assert.equal(recovered.nextRetryAt, null);
  } finally {
    ScheduledPost.prototype.save = originalSave;
  }
});

test('ambiguous timeout requires owner review before a manual retry', async () => {
  const due = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Timeout', scheduledAt: new Date(Date.now() - 1000), platforms: [{ platform: 'email', content: 'Test' }] });
  const url = base.replace(post.id, due.id);
  const headers = { Authorization: `Bearer ${token(owner)}`, 'Content-Type': 'application/json' };
  providerFailure = Object.assign(new Error('simulated timeout'), { retryable: true });
  try {
    armDelivery();
    const worker = processDueScheduledPosts();
    await started;
    releaseDelivery();
    assert.equal(await worker, 1);
    const unknown = await ScheduledPost.findById(due.id);
    assert.equal(unknown.deliveryOutcomeUnknown, true);
    assert.equal(unknown.platforms[0].outcomeUnknown, true);
    assert.equal(unknown.nextRetryAt, null);
    assert.equal((await fetch(`${url}/retry`, { method: 'POST', headers })).status, 409);
    assert.equal(await processDueScheduledPosts({ now: new Date(Date.now() + 3600000) }), 0);
    const resolution = { platformIndex: 0, outcome: 'not_published', verifiedProvider: true, previousAttemptEnded: true };
    assert.equal((await fetch(`${url}/resolve-delivery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resolution) })).status, 401);
    assert.equal((await fetch(`${url}/resolve-delivery`, { method: 'POST', headers: { Authorization: `Bearer ${token(other)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(resolution) })).status, 404);
    assert.equal((await fetch(`${url}/resolve-delivery`, { method: 'POST', headers, body: JSON.stringify({ ...resolution, verifiedProvider: false }) })).status, 400);
    const beforeReview = calls;
    assert.equal((await fetch(`${url}/resolve-delivery`, { method: 'POST', headers, body: JSON.stringify(resolution) })).status, 200);
    assert.equal(calls, beforeReview);
    const reviewed = await ScheduledPost.findById(due.id);
    assert.equal(reviewed.deliveryOutcomeUnknown, false);
    assert.equal(reviewed.platforms[0].status, 'failed');
    assert.ok(reviewed.platforms[0].outcomeReviewedAt);
    assert.equal(reviewed.nextRetryAt, null);
    assert.equal((await fetch(`${url}/resolve-delivery`, { method: 'POST', headers, body: JSON.stringify(resolution) })).status, 409);
    providerFailure = null;
    armDelivery();
    const retry = fetch(`${url}/retry`, { method: 'POST', headers });
    await started;
    releaseDelivery();
    assert.equal((await retry).status, 200);
    assert.equal((await ScheduledPost.findById(due.id)).status, 'published');
  } finally { providerFailure = null; }
});

test('multi-platform reviews preserve completed platforms and require every unknown outcome', async () => {
  const postToReview = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Multiple', scheduledAt: new Date(), status: 'partial', deliveryOutcomeUnknown: true, platforms: [{ platform: 'twitter', content: 'Done', status: 'published', externalPostId: 'existing-id' }, { platform: 'email', content: 'Unknown', status: 'failed', outcomeUnknown: true }, { platform: 'blog', content: 'Unknown', status: 'failed', outcomeUnknown: true }] });
  const url = base.replace(post.id, postToReview.id);
  const headers = { Authorization: `Bearer ${token(owner)}`, 'Content-Type': 'application/json' };
  const resolve = (index, outcome) => fetch(`${url}/resolve-delivery`, { method: 'POST', headers, body: JSON.stringify({ platformIndex: index, outcome, verifiedProvider: true, previousAttemptEnded: true }) });
  assert.equal((await resolve(1, 'not_published')).status, 200);
  assert.equal((await fetch(`${url}/retry`, { method: 'POST', headers })).status, 409);
  assert.equal((await resolve(2, 'published')).status, 200);
  const result = await ScheduledPost.findById(postToReview.id);
  assert.equal(result.deliveryOutcomeUnknown, false);
  assert.equal(result.platforms[0].externalPostId, 'existing-id');
  assert.equal(result.platforms[1].status, 'failed');
  assert.equal(result.platforms[2].status, 'published');
  assert.equal(result.status, 'partial');
});

test('provider review can record an already-published outcome without sending', async () => {
  const unknown = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: 'Review', scheduledAt: new Date(), status: 'failed', deliveryOutcomeUnknown: true, platforms: [{ platform: 'email', content: 'Test', status: 'failed', outcomeUnknown: true }] });
  const url = base.replace(post.id, unknown.id);
  const headers = { Authorization: `Bearer ${token(owner)}`, 'Content-Type': 'application/json' };
  const beforeReview = calls;
  const response = await fetch(`${url}/resolve-delivery`, { method: 'POST', headers, body: JSON.stringify({ platformIndex: 0, outcome: 'published', verifiedProvider: true, previousAttemptEnded: true }) });
  assert.equal(response.status, 200);
  assert.equal((await ScheduledPost.findById(unknown.id)).status, 'published');
  assert.equal(calls, beforeReview);
});

test('unresolved outcomes cannot be cancelled or deleted, including legacy platform flags', async () => {
  for (const marker of ['post', 'platform', 'legacy']) {
    const item = await ScheduledPost.create({
      userId: owner._id, sourceType: 'manual_broadcast', title: marker, scheduledAt: new Date(), status: 'failed',
      deliveryOutcomeUnknown: marker === 'post',
      platforms: [{ platform: 'email', content: 'Test', status: 'failed', outcomeUnknown: marker === 'platform', retryable: marker === 'legacy' }],
    });
    const url = base.replace(post.id, item.id);
    const headers = { Authorization: `Bearer ${token(owner)}` };
    assert.equal((await fetch(`${url}/cancel`, { method: 'POST', headers })).status, 409);
    assert.equal((await fetch(url, { method: 'DELETE', headers })).status, 409);
    assert.equal((await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token(other)}` } })).status, 404);
    const saved = await ScheduledPost.findById(item.id);
    assert.equal(saved.status, 'failed');
    assert.equal(saved.deliveryOutcomeUnknown, marker === 'post');
    assert.equal(saved.platforms[0].outcomeUnknown, marker === 'platform');
    assert.equal(saved.platforms[0].retryable, marker === 'legacy');
  }
});

test('reviewed posts may be cancelled or deleted normally', async () => {
  for (const action of ['cancel', 'delete']) {
    const item = await ScheduledPost.create({ userId: owner._id, sourceType: 'manual_broadcast', title: action, scheduledAt: new Date(), status: 'failed', deliveryOutcomeUnknown: true, platforms: [{ platform: 'email', content: 'Test', status: 'failed', outcomeUnknown: true }] });
    const url = base.replace(post.id, item.id);
    const headers = { Authorization: `Bearer ${token(owner)}`, 'Content-Type': 'application/json' };
    const review = { platformIndex: 0, outcome: 'not_published', verifiedProvider: true, previousAttemptEnded: true };
    assert.equal((await fetch(`${url}/resolve-delivery`, { method: 'POST', headers, body: JSON.stringify(review) })).status, 200);
    assert.equal((await fetch(action === 'cancel' ? `${url}/cancel` : url, { method: action === 'cancel' ? 'POST' : 'DELETE', headers })).status, 200);
    const saved = await ScheduledPost.findById(item.id);
    if (action === 'cancel') assert.equal(saved.status, 'cancelled');
    else assert.equal(saved, null);
  }
});
