const express = require('express');
const schedulerRouter = express.Router();
const schedulerService = require('../../../services/schedulerService');

schedulerRouter.all('/run', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-cron-secret'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (cronSecret) {
    if (token !== cronSecret && customHeader !== cronSecret) {
      return res.status(401).json({ success: false, message: 'Unauthorized cron invocation.' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'CRON_SECRET must be configured in production to execute scheduled posts via API.',
    });
  }

  try {
    const workerId = `cron-runner-${Date.now()}`;
    const processedCount = await schedulerService.processDueScheduledPosts({ workerId, batchLimit: 15 });
    return res.status(200).json({
      success: true,
      message: `Processed ${processedCount} due post(s).`,
      processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron scheduler trigger failed:', error.message);
    return res.status(500).json({ success: false, message: 'Scheduler execution failed.' });
  }
});

module.exports = schedulerRouter;
