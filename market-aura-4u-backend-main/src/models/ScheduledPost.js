const mongoose = require('mongoose');

const platformDeliverySchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog'],
    required: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  mediaAssetIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MediaAsset',
  }],
  mediaUrls: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'published', 'failed', 'cancelled'],
    default: 'pending',
  },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: null },
  retryable: { type: Boolean, default: false },
  externalPostId: { type: String, default: null },
  externalPostUrl: { type: String, default: null },
  publishedAt: { type: Date, default: null },
}, { _id: false });

const scheduledPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null,
  },
  sourceType: {
    type: String,
    enum: ['ai_generated', 'manual_broadcast'],
    required: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  scheduledAt: { type: Date, required: true, index: true },
  timezone: { type: String, default: 'UTC' },
  recommendedTimeUsed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['scheduled', 'processing', 'published', 'partial', 'failed', 'cancelled'],
    default: 'scheduled',
    index: true,
  },
  platforms: {
    type: [platformDeliverySchema],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0,
      message: 'At least one platform target is required',
    },
  },
  lockUntil: { type: Date, default: null },
  lockedBy: { type: String, default: null },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: { type: Date, default: null },
  lastRunAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.lockUntil;
      delete ret.lockedBy;
      return ret;
    },
  },
});

scheduledPostSchema.index({ status: 1, scheduledAt: 1 });
scheduledPostSchema.index({ status: 1, nextRetryAt: 1 });
scheduledPostSchema.index({ userId: 1, scheduledAt: -1 });

module.exports = mongoose.models.ScheduledPost || mongoose.model('ScheduledPost', scheduledPostSchema);
