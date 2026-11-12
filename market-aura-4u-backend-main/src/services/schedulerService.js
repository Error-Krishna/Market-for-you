const crypto = require('node:crypto');
const mongoose = require('mongoose');
const ScheduledPost = require('../models/ScheduledPost');
const User = require('../models/User');
const MediaAsset = require('../models/MediaAsset');
const { publishToPlatform } = require('./publishers');

const RETRY_BACKOFF_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];
const LOCK_DURATION_MS = 2 * 60 * 1000;

async function resolveMediaUrlsForDelivery(entry, userId) {
  const urls = Array.isArray(entry.mediaUrls) ? entry.mediaUrls.filter(Boolean) : [];
  if (urls.length > 0) return urls;
  if (!Array.isArray(entry.mediaAssetIds) || entry.mediaAssetIds.length === 0) return [];
  const assets = await MediaAsset.find({ _id: { $in: entry.mediaAssetIds }, userId }).select('url');
  return assets.map((a) => a.url).filter(Boolean);
}

function summarizeOverallStatus(platforms) {
  const active = platforms.filter((p) => p.status !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  const publishedCount = active.filter((p) => p.status === 'published').length;
  const pendingCount = active.filter((p) => p.status === 'pending' || p.status === 'processing').length;
  const failedCount = active.filter((p) => p.status === 'failed').length;

  if (pendingCount > 0) return 'processing';
  if (publishedCount === active.length) return 'published';
  if (publishedCount > 0 && failedCount > 0) return 'partial';
  return 'failed';
}

async function executePostDelivery(post, user, { onlyStatuses = ['pending'] } = {}) {
  const targetIndices = [];
  post.platforms.forEach((entry, index) => {
    if (onlyStatuses.includes(entry.status)) {
      targetIndices.push(index);
    }
  });

  if (targetIndices.length === 0) {
    post.status = summarizeOverallStatus(post.platforms);
    post.lockUntil = null;
    post.lockedBy = null;
    post.nextRetryAt = null;
    await post.save();
    return post;
  }

  await Promise.allSettled(
    targetIndices.map(async (index) => {
      const entry = post.platforms[index];
      entry.status = 'processing';
      entry.attempts = (entry.attempts || 0) + 1;
      try {
        const mediaUrls = await resolveMediaUrlsForDelivery(entry, post.userId);
        const result = await publishToPlatform(entry.platform, {
          user,
          content: entry.content,
          mediaUrls,
          title: post.title,
        });
        entry.status = 'published';
        entry.externalPostId = result?.externalPostId || null;
        entry.externalPostUrl = result?.externalPostUrl || null;
        entry.publishedAt = new Date();
        entry.lastError = null;
        entry.retryable = false;
      } catch (err) {
        entry.status = 'failed';
        entry.lastError = err?.message || 'Publishing failed';
        entry.retryable = Boolean(err?.retryable);
      }
    }),
  );

  post.status = summarizeOverallStatus(post.platforms);
  post.lastRunAt = new Date();
  post.lockUntil = null;
  post.lockedBy = null;

  const hasRetryableFailure = post.platforms.some((p) => p.status === 'failed' && p.retryable);
  if (hasRetryableFailure && (post.retryCount || 0) < (post.maxRetries || 3)) {
    const delayMs = RETRY_BACKOFF_MS[Math.min(post.retryCount || 0, RETRY_BACKOFF_MS.length - 1)];
    post.retryCount = (post.retryCount || 0) + 1;
    post.nextRetryAt = new Date(Date.now() + delayMs);
  } else {
    post.nextRetryAt = null;
  }

  await post.save();
  return post;
}

async function claimDuePost(now, workerId) {
  return ScheduledPost.findOneAndUpdate(
    {
      $and: [
        {
          $or: [
            { status: 'scheduled', scheduledAt: { $lte: now } },
            { status: { $in: ['partial', 'failed'] }, nextRetryAt: { $ne: null, $lte: now } },
          ],
        },
        {
          $or: [
            { lockUntil: null },
            { lockUntil: { $lte: now } },
          ],
        },
      ],
    },
    {
      $set: {
        status: 'processing',
        lockUntil: new Date(now.getTime() + LOCK_DURATION_MS),
        lockedBy: workerId,
        lastRunAt: now,
      },
    },
    {
      sort: { scheduledAt: 1 },
      new: true,
    },
  );
}

async function processDueScheduledPosts({ now = new Date(), workerId = crypto.randomUUID(), batchLimit = 10 } = {}) {
  if (mongoose.connection.readyState !== 1) return 0;

  let processed = 0;
  for (let i = 0; i < batchLimit; i += 1) {
    const post = await claimDuePost(now, workerId);
    if (!post) break;
    processed += 1;

    try {
      const user = await User.findById(post.userId);
      if (!user) {
        post.platforms.forEach((entry) => {
          if (entry.status === 'pending' || entry.status === 'processing') {
            entry.status = 'failed';
            entry.lastError = 'Account no longer exists.';
            entry.retryable = false;
          }
        });
        post.status = 'failed';
        post.lockUntil = null;
        post.lockedBy = null;
        post.nextRetryAt = null;
        await post.save();
        continue;
      }

      const targetStatuses = post.retryCount > 0 ? ['pending', 'failed'] : ['pending'];
      await executePostDelivery(post, user, { onlyStatuses: targetStatuses });
    } catch (err) {
      console.error(`Scheduler execution error for post ${post._id}:`, err.message);
      await ScheduledPost.findByIdAndUpdate(post._id, {
        $set: { status: 'failed', lockUntil: null, lockedBy: null, nextRetryAt: null },
      }).catch(() => {});
    }
  }
  return processed;
}

let timer = null;
let tickInFlight = false;

function startScheduler({ intervalMs = 15000 } = {}) {
  if (timer) return;
  const workerId = `worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  timer = setInterval(async () => {
    if (tickInFlight) return;
    tickInFlight = true;
    try {
      await processDueScheduledPosts({ workerId });
    } catch (err) {
      console.error('Scheduler tick error:', err.message);
    } finally {
      tickInFlight = false;
    }
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  executePostDelivery,
  processDueScheduledPosts,
  startScheduler,
  stopScheduler,
  summarizeOverallStatus,
};
