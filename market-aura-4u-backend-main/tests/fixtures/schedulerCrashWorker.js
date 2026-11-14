const mongoose = require('mongoose');
const uri = process.env.MARKET_AURA_TEST_MONGO_URI;
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/market_aura_disposable_/.test(uri || '')) throw new Error('Disposable loopback database required');
const User = require('../../src/models/User');
if (process.env.CRASH_STAGE === 'claimed') {
  User.findById = async () => {
    process.send({ stage: 'claimed' });
    await new Promise(() => {});
  };
}
const publishers = require('../../src/services/publishers');
publishers.publishToPlatform = async () => {
  if (process.env.CRASH_STAGE === 'provider_accepted') {
    process.send({ stage: 'provider_accepted' });
    await new Promise(() => {});
  }
  return { externalPostId: 'mock-provider-success' };
};
if (process.env.CRASH_STAGE === 'before_save') {
  const ScheduledPost = require('../../src/models/ScheduledPost');
  ScheduledPost.prototype.save = async function () {
    process.send({ stage: 'before_save' });
    await new Promise(() => {});
  };
}
const { processDueScheduledPosts } = require('../../src/services/schedulerService');
(async () => {
  await mongoose.connect(uri);
  await processDueScheduledPosts({ workerId: 'crash-test-worker' });
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
