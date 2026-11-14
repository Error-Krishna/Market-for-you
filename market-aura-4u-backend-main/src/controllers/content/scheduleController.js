const mongoose = require('mongoose');
const Job = require('../../models/Job');
const User = require('../../models/User');
const MediaAsset = require('../../models/MediaAsset');
const ScheduledPost = require('../../models/ScheduledPost');
const { computeNextRecommendedDate } = require('../../utils/recommendedTime');
const { validatePublicHttpUrl } = require('../../utils/tokenCrypto');
const { executePostDelivery } = require('../../services/schedulerService');

const ALLOWED_PLATFORMS = new Set(['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog']);
const DELIVERY_LEASE_MS = 2 * 60 * 1000;

function requiresDeliveryReview(post) {
  return post.deliveryOutcomeUnknown || (post.platforms || []).some((entry) => entry.outcomeUnknown || entry.retryable);
}

function toPlainObject(maybeMap) {
  if (!maybeMap) return {};
  if (maybeMap instanceof Map) return Object.fromEntries(maybeMap);
  return typeof maybeMap === 'object' ? maybeMap : {};
}

function buildBroadcastPlatformContent(platform, shared) {
  const text = String(shared?.text || '').trim();
  const subject = String(shared?.subject || shared?.title || 'Campaign Update').trim();
  const title = String(shared?.title || '').trim();
  const body = String(shared?.body || text).trim();
  const mediaUrl = Array.isArray(shared?.mediaUrls) && shared.mediaUrls[0] ? shared.mediaUrls[0] : undefined;

  switch (platform) {
    case 'twitter':
      return [{ text, ...(mediaUrl ? { image_url: mediaUrl } : {}) }];
    case 'linkedin':
    case 'facebook':
      return [text];
    case 'instagram':
      return { caption: text, ...(mediaUrl ? { image_url: mediaUrl } : {}), content_type: 'image' };
    case 'email':
      return { subject, body };
    case 'blog':
      return title ? { title, body } : [body];
    default:
      return text;
  }
}

function hasNonEmptyPlatformContent(platform, content) {
  if (!content) return false;
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) {
    return content.some((item) => {
      if (typeof item === 'string') return item.trim().length > 0;
      if (item && typeof item.text === 'string') return item.text.trim().length > 0;
      return false;
    });
  }
  if (typeof content === 'object') {
    if (platform === 'instagram') return typeof content.caption === 'string' && content.caption.trim().length > 0;
    if (platform === 'email') return Boolean(content.subject?.trim() && (content.body?.trim() || content.text?.trim()));
    if (platform === 'blog') return Boolean(content.body?.trim() || content.content?.trim() || content.text?.trim());
    if (typeof content.text === 'string') return content.text.trim().length > 0;
  }
  return false;
}

async function resolveUserMediaAssets(userId, assetIds = [], rawUrls = []) {
  const validIds = Array.isArray(assetIds)
    ? assetIds.filter((id) => mongoose.isValidObjectId(id)).map((id) => String(id))
    : [];

  let resolvedAssets = [];
  if (validIds.length > 0) {
    resolvedAssets = await MediaAsset.find({ _id: { $in: validIds }, userId }).select('_id url');
    if (resolvedAssets.length !== new Set(validIds).size) {
      return { error: 'One or more selected media assets were not found.' };
    }
  }

  const assetUrlMap = new Map(resolvedAssets.map((a) => [String(a._id), a.url]));
  const orderedAssetUrls = validIds.map((id) => assetUrlMap.get(id)).filter(Boolean);

  const externalUrls = [];
  if (Array.isArray(rawUrls)) {
    for (const u of rawUrls) {
      if (typeof u !== 'string' || !u.trim()) continue;
      // Allow local uploaded URLs or validated external URLs
      const isLocalUpload = /\/uploads\/media\/[a-fA-F0-9]{24}\/[a-fA-F0-9-]+\.(jpg|png|webp|gif|mp4)$/.test(u.trim());
      if (isLocalUpload) {
        externalUrls.push(u.trim());
      } else {
        const safe = validatePublicHttpUrl(u, { allowHttpInDev: true });
        if (!safe) return { error: `Invalid media URL: ${u}` };
        externalUrls.push(safe);
      }
    }
  }

  return {
    mediaAssetIds: resolvedAssets.map((a) => a._id),
    mediaUrls: [...new Set([...orderedAssetUrls, ...externalUrls])],
  };
}

const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mode = 'now',
      sourceType,
      jobId,
      title,
      scheduledAt,
      timezone,
      recommendedPostingTime,
      platforms: requestedPlatforms,
      sharedContent,
      platformOverrides = {},
      mediaAssetIds = [],
      mediaUrls = [],
    } = req.body || {};

    if (!['now', 'recommended', 'custom'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'mode must be "now", "recommended", or "custom".' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let job = null;
    let jobContent = {};
    const normalizedJobId = typeof jobId === 'string' ? jobId.trim() : '';
    if (jobId !== undefined && jobId !== null && normalizedJobId !== '') {
      if (
        typeof jobId !== 'string' ||
        !/^[a-f\d]{24}$/i.test(normalizedJobId) ||
        !mongoose.isValidObjectId(normalizedJobId)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content job ID. Please regenerate content or publish via Manual Broadcast.',
        });
      }
      job = await Job.findOne({ _id: normalizedJobId, userId });
      if (!job || job.status !== 'completed') {
        return res.status(404).json({ success: false, message: 'Completed content generation job not found.' });
      }
      jobContent = toPlainObject(job.generatedContent);
    }

    const resolvedSourceType = sourceType || (job ? 'ai_generated' : 'manual_broadcast');
    if (resolvedSourceType === 'ai_generated' && !job) {
      return res.status(400).json({ success: false, message: 'jobId is required for AI-generated posts.' });
    }

    if (!Array.isArray(requestedPlatforms) || requestedPlatforms.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one platform.' });
    }

    const sharedMedia = await resolveUserMediaAssets(userId, mediaAssetIds, mediaUrls);
    if (sharedMedia.error) {
      return res.status(400).json({ success: false, message: sharedMedia.error });
    }

    const deliveries = [];
    const seenPlatforms = new Set();

    for (const item of requestedPlatforms) {
      const platform = typeof item === 'string' ? item : item?.platform;
      if (!ALLOWED_PLATFORMS.has(platform) || seenPlatforms.has(platform)) continue;
      seenPlatforms.add(platform);

      let entryMedia = sharedMedia;
      if (item && typeof item === 'object' && (item.mediaAssetIds || item.mediaUrls)) {
        entryMedia = await resolveUserMediaAssets(userId, item.mediaAssetIds, item.mediaUrls);
        if (entryMedia.error) {
          return res.status(400).json({ success: false, message: entryMedia.error });
        }
      }

      let content = (item && typeof item === 'object' && item.content !== undefined)
        ? item.content
        : (platformOverrides[platform] !== undefined ? platformOverrides[platform] : undefined);

      if (content === undefined) {
        if (job && jobContent[platform] !== undefined) {
          content = jobContent[platform];
        } else if (sharedContent) {
          content = buildBroadcastPlatformContent(platform, {
            ...sharedContent,
            mediaUrls: entryMedia.mediaUrls,
          });
        }
      }

      if (!hasNonEmptyPlatformContent(platform, content)) {
        return res.status(400).json({
          success: false,
          message: `Content for "${platform}" cannot be empty.`,
        });
      }

      deliveries.push({
        platform,
        content,
        mediaAssetIds: entryMedia.mediaAssetIds,
        mediaUrls: entryMedia.mediaUrls,
        status: 'pending',
      });
    }

    if (deliveries.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid platforms selected.' });
    }

    let finalScheduledAt = new Date();
    let recommendedTimeUsed = false;

    if (mode === 'recommended') {
      const recTime = recommendedPostingTime
        || jobContent?.grounding?.recommendation?.recommended_posting_time
        || null;
      if (!recTime) {
        return res.status(400).json({
          success: false,
          message: 'No ML recommended posting time is available for this post.',
        });
      }
      finalScheduledAt = computeNextRecommendedDate(recTime);
      recommendedTimeUsed = true;
    } else if (mode === 'custom') {
      const parsedDate = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Provide a valid ISO date/time for scheduling.' });
      }
      if (parsedDate.getTime() < Date.now() - 60 * 1000) {
        return res.status(400).json({ success: false, message: 'Scheduled time must be in the future.' });
      }
      finalScheduledAt = parsedDate;
    }

    const postTitle = (typeof title === 'string' && title.trim())
      || job?.originalContent?.slice(0, 200)
      || (typeof sharedContent?.title === 'string' && sharedContent.title.trim())
      || (typeof sharedContent?.text === 'string' && sharedContent.text.trim().slice(0, 120))
      || 'Broadcast Post';

    const post = await ScheduledPost.create({
      userId,
      jobId: job?._id || null,
      sourceType: resolvedSourceType,
      title: postTitle.slice(0, 300),
      scheduledAt: finalScheduledAt,
      timezone: typeof timezone === 'string' && timezone.trim() ? timezone.trim() : (user.timezone || 'UTC'),
      recommendedTimeUsed,
      status: mode === 'now' ? 'processing' : 'scheduled',
      lockUntil: mode === 'now' ? new Date(Date.now() + DELIVERY_LEASE_MS) : null,
      platforms: deliveries,
    });

    if (mode === 'now') {
      const completed = await executePostDelivery(post, user, { onlyStatuses: ['pending'] });
      const anySuccess = completed.platforms.some((p) => p.status === 'published');
      return res.status(200).json({
        success: anySuccess,
        message: completed.status === 'published'
          ? 'Published to all selected platforms!'
          : completed.status === 'partial'
          ? 'Published to some platforms; check failed platforms below.'
          : 'Publishing failed for all selected platforms.',
        post: completed,
      });
    }

    return res.status(201).json({
      success: true,
      message: mode === 'recommended'
        ? 'Scheduled at ML recommended posting time!'
        : 'Post scheduled successfully!',
      post,
    });
  } catch (error) {
    console.error('Create scheduled post error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create or publish post.' });
  }
};

const listPosts = async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.status && ['scheduled', 'processing', 'published', 'partial', 'failed', 'cancelled'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.sourceType && ['ai_generated', 'manual_broadcast'].includes(req.query.sourceType)) {
      filter.sourceType = req.query.sourceType;
    }

    const posts = await ScheduledPost.find(filter).sort({ scheduledAt: -1, createdAt: -1 }).limit(100);
    return res.status(200).json({ success: true, count: posts.length, posts });
  } catch (error) {
    console.error('List scheduled posts error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch scheduled posts.' });
  }
};

const getPost = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }
    const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    return res.status(200).json({ success: true, post });
  } catch (error) {
    console.error('Get scheduled post error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch post.' });
  }
};

const updatePost = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }
    const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (requiresDeliveryReview(post)) return res.status(409).json({ success: false, message: 'Delivery outcome is unknown. Check the provider before taking further action.' });
    if (post.status === 'published' || post.status === 'processing') {
      return res.status(400).json({ success: false, message: `Cannot edit a post with status "${post.status}".` });
    }

    const { title, scheduledAt, timezone, platforms } = req.body || {};

    if (typeof title === 'string' && title.trim()) {
      post.title = title.trim().slice(0, 300);
    }
    if (typeof timezone === 'string' && timezone.trim()) {
      post.timezone = timezone.trim();
    }
    if (scheduledAt !== undefined) {
      const parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 60 * 1000) {
        return res.status(400).json({ success: false, message: 'scheduledAt must be a valid future date.' });
      }
      post.scheduledAt = parsed;
      post.recommendedTimeUsed = false;
      if (post.status === 'cancelled' || post.status === 'failed') {
        post.status = 'scheduled';
      }
    }

    if (Array.isArray(platforms) && platforms.length > 0) {
      const existingByPlatform = new Map(post.platforms.map((p) => [p.platform, p]));
      const nextDeliveries = [];
      for (const item of platforms) {
        if (!item || !ALLOWED_PLATFORMS.has(item.platform)) continue;
        const existing = existingByPlatform.get(item.platform);
        if (existing?.status === 'published') {
          nextDeliveries.push(existing);
          continue;
        }
        const media = await resolveUserMediaAssets(req.user.id, item.mediaAssetIds, item.mediaUrls);
        if (media.error) {
          return res.status(400).json({ success: false, message: media.error });
        }
        const nextContent = item.content !== undefined ? item.content : existing?.content;
        if (!hasNonEmptyPlatformContent(item.platform, nextContent)) {
          return res.status(400).json({ success: false, message: `Content for "${item.platform}" cannot be empty.` });
        }
        nextDeliveries.push({
          platform: item.platform,
          content: nextContent,
          mediaAssetIds: media.mediaAssetIds,
          mediaUrls: media.mediaUrls,
          status: 'pending',
          attempts: existing?.attempts || 0,
          lastError: null,
          retryable: false,
        });
      }
      if (nextDeliveries.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one valid platform is required.' });
      }
      post.platforms = nextDeliveries;
      post.status = 'scheduled';
      post.nextRetryAt = null;
    }

    await post.save();
    return res.status(200).json({ success: true, message: 'Scheduled post updated', post });
  } catch (error) {
    console.error('Update scheduled post error:', error.message);
    if (error.name === 'VersionError') return res.status(409).json({ success: false, message: 'Post changed while editing. Refresh and try again.' });
    return res.status(500).json({ success: false, message: 'Failed to update scheduled post.' });
  }
};

const publishPostNow = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }
    const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (requiresDeliveryReview(post)) return res.status(409).json({ success: false, message: 'Delivery outcome is unknown. Check the provider before taking further action.' });
    if (post.status === 'published') {
      return res.status(400).json({ success: false, message: 'Post has already been published to all platforms.' });
    }
    if (post.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot publish a cancelled post.' });
    }
    if (post.status === 'processing' && post.lockUntil && new Date(post.lockUntil).getTime() > Date.now()) {
      return res.status(409).json({ success: false, message: 'Post delivery is already in progress.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const claimed = await ScheduledPost.findOneAndUpdate(
      { _id: post._id, userId: req.user.id, deliveryOutcomeUnknown: { $ne: true }, status: { $in: ['scheduled', 'partial', 'failed'] } },
      { $set: { status: 'processing', scheduledAt: new Date(), nextRetryAt: null, lockUntil: new Date(Date.now() + DELIVERY_LEASE_MS) }, $inc: { __v: 1 } },
      { new: true },
    );
    if (!claimed) return res.status(409).json({ success: false, message: 'Post delivery is already in progress or its status changed.' });

    const completed = await executePostDelivery(claimed, user, { onlyStatuses: ['pending', 'failed'] });
    const anySuccess = completed.platforms.some((p) => p.status === 'published');
    return res.status(200).json({
      success: anySuccess,
      message: completed.status === 'published'
        ? 'Published to all platforms!'
        : completed.status === 'partial'
        ? 'Published to some platforms; check failed platforms.'
        : 'Publishing failed.',
      post: completed,
    });
  } catch (error) {
    console.error('Publish post now error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to publish post.' });
  }
};

const retryFailedPlatforms = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }
    const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (requiresDeliveryReview(post)) return res.status(409).json({ success: false, message: 'Delivery outcome is unknown. Check the provider before taking further action.' });
    if (post.status === 'processing' && post.lockUntil && new Date(post.lockUntil).getTime() > Date.now()) {
      return res.status(409).json({ success: false, message: 'Post delivery is already in progress.' });
    }

    const hasFailed = post.platforms.some((p) => p.status === 'failed');
    if (!hasFailed) {
      return res.status(400).json({ success: false, message: 'No failed platforms to retry.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const claimed = await ScheduledPost.findOneAndUpdate(
      { _id: post._id, userId: req.user.id, deliveryOutcomeUnknown: { $ne: true }, status: { $in: ['partial', 'failed'] }, 'platforms.status': 'failed' },
      { $set: { status: 'processing', nextRetryAt: null, lockUntil: new Date(Date.now() + DELIVERY_LEASE_MS) }, $inc: { __v: 1 } },
      { new: true },
    );
    if (!claimed) return res.status(409).json({ success: false, message: 'Post delivery is already in progress or its status changed.' });

    const completed = await executePostDelivery(claimed, user, { onlyStatuses: ['failed'] });
    return res.status(200).json({
      success: completed.status === 'published' || completed.status === 'partial',
      message: completed.status === 'published' ? 'All failed platforms succeeded on retry!' : 'Retry finished.',
      post: completed,
    });
  } catch (error) {
    console.error('Retry post error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retry post.' });
  }
};

const resolveDeliveryOutcome = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    const { platformIndex, outcome, verifiedProvider, previousAttemptEnded } = req.body || {};
    if (!Number.isInteger(platformIndex) || platformIndex < 0 || !['published', 'not_published'].includes(outcome) || verifiedProvider !== true || previousAttemptEnded !== true) {
      return res.status(400).json({ success: false, message: 'Specify a platform index and confirmed outcome, and confirm provider review and that the previous attempt ended.' });
    }
    const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.status === 'processing') return res.status(409).json({ success: false, message: 'Delivery is still in progress.' });
    const entry = post.platforms[platformIndex];
    if (!entry || !(entry.outcomeUnknown || entry.retryable)) return res.status(409).json({ success: false, message: 'This platform has no unresolved delivery outcome.' });
    entry.status = outcome === 'published' ? 'published' : 'failed';
    entry.outcomeUnknown = false;
    entry.retryable = false;
    entry.outcomeReviewedAt = new Date();
    entry.lastError = outcome === 'published' ? null : 'Provider review confirmed this delivery was not published.';
    post.deliveryOutcomeUnknown = post.platforms.some((item) => item.outcomeUnknown || item.retryable);
    post.nextRetryAt = null;
    post.status = post.platforms.every((item) => item.status === 'published' || item.status === 'cancelled')
      ? 'published' : post.platforms.some((item) => item.status === 'published') ? 'partial' : 'failed';
    await post.save();
    return res.status(200).json({ success: true, message: 'Delivery outcome recorded. No delivery was started.', post });
  } catch (error) {
    if (error.name === 'VersionError') return res.status(409).json({ success: false, message: 'Post changed during review. Refresh and try again.' });
    console.error('Resolve delivery outcome error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to record delivery outcome.' });
  }
};

const cancelPost = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }
    const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (requiresDeliveryReview(post)) return res.status(409).json({ success: false, message: 'Delivery outcome is unknown. Check the provider before taking further action.' });
    if (post.status === 'published' || post.status === 'processing') {
      return res.status(400).json({ success: false, message: `Cannot cancel a post that is ${post.status}.` });
    }

    post.status = 'cancelled';
    post.nextRetryAt = null;
    post.platforms.forEach((p) => {
      if (p.status === 'pending' || p.status === 'failed') p.status = 'cancelled';
    });
    await post.save();
    return res.status(200).json({ success: true, message: 'Scheduled post cancelled', post });
  } catch (error) {
    console.error('Cancel post error:', error.message);
    if (error.name === 'VersionError') return res.status(409).json({ success: false, message: 'Post changed while cancelling. Refresh and try again.' });
    return res.status(500).json({ success: false, message: 'Failed to cancel post.' });
  }
};

const deletePost = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }
    const deleted = await ScheduledPost.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
      status: { $ne: 'processing' },
      deliveryOutcomeUnknown: { $ne: true },
      platforms: { $not: { $elemMatch: { $or: [{ outcomeUnknown: true }, { retryable: true }] } } },
    });
    if (!deleted) {
      const post = await ScheduledPost.findOne({ _id: req.params.id, userId: req.user.id });
      if (post && requiresDeliveryReview(post)) return res.status(409).json({ success: false, message: 'Delivery outcome is unknown. Check the provider before deleting this post.' });
      return res.status(404).json({ success: false, message: 'Post not found or currently processing.' });
    }
    return res.status(200).json({ success: true, message: 'Post deleted.' });
  } catch (error) {
    console.error('Delete post error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
};

module.exports = {
  createPost,
  listPosts,
  getPost,
  updatePost,
  publishPostNow,
  retryFailedPlatforms,
  resolveDeliveryOutcome,
  cancelPost,
  deletePost,
  buildBroadcastPlatformContent,
};
