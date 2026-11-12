const Job = require('../../models/Job');
const User = require('../../models/User');
const ScheduledPost = require('../../models/ScheduledPost');
const { executePostDelivery } = require('../../services/schedulerService');

const publishContent = async (req, res) => {
  try {
    const { jobId, platforms, platformOverrides = {}, mediaAssetIds = [], mediaUrls = [] } = req.body || {};
    const userId = req.user.id;

    if (!jobId || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ success: false, message: 'jobId and platforms array are required.' });
    }

    const [job, user] = await Promise.all([
      Job.findOne({ _id: jobId, userId }),
      User.findById(userId),
    ]);

    if (!job || job.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Job not ready or not found' });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const generatedContent = job.generatedContent instanceof Map
      ? Object.fromEntries(job.generatedContent)
      : (job.generatedContent || {});

    const deliveries = [];
    const results = [];

    for (const platform of platforms) {
      const content = platformOverrides[platform] !== undefined
        ? platformOverrides[platform]
        : generatedContent[platform];

      if (!content) {
        results.push({ platform, success: false, message: `No ${platform} content generated` });
        continue;
      }

      deliveries.push({
        platform,
        content,
        mediaAssetIds,
        mediaUrls,
        status: 'pending',
      });
    }

    if (deliveries.length > 0) {
      const post = await ScheduledPost.create({
        userId,
        jobId: job._id,
        sourceType: 'ai_generated',
        title: (job.originalContent || 'AI Generated Post').slice(0, 300),
        scheduledAt: new Date(),
        timezone: user.timezone || 'UTC',
        status: 'processing',
        platforms: deliveries,
      });

      const completed = await executePostDelivery(post, user, { onlyStatuses: ['pending'] });
      for (const entry of completed.platforms) {
        results.push({
          platform: entry.platform,
          success: entry.status === 'published',
          message: entry.status === 'published' ? 'Published successfully' : (entry.lastError || 'Publishing failed'),
          url: entry.externalPostUrl || undefined,
          externalPostId: entry.externalPostId || undefined,
          real: true,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    return res.status(200).json({
      success: successful > 0,
      message: `Published: ${successful} successful, ${results.length - successful} failed`,
      results,
    });
  } catch (error) {
    console.error('Publishing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  publishContent,
};
