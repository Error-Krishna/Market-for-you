const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog'],
    required: true,
    index: true,
  },
  providerAccountId: {
    type: String,
    required: true,
    trim: true,
  },
  username: { type: String, default: null, trim: true },
  displayName: { type: String, default: null, trim: true },
  profileImage: { type: String, default: null },
  email: { type: String, default: null, trim: true },
  encryptedAccessToken: { type: String, default: null, select: false },
  encryptedRefreshToken: { type: String, default: null, select: false },
  tokenExpiry: { type: Date, default: null },
  grantedScopes: [{ type: String }],
  connectionStatus: {
    type: String,
    enum: ['connected', 'expired', 'disconnected', 'error'],
    default: 'connected',
    index: true,
  },
  lastConnectedAt: { type: Date, default: Date.now },
  lastRefreshedAt: { type: Date, default: null },
  lastError: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.encryptedAccessToken;
      delete ret.encryptedRefreshToken;
      return ret;
    },
  },
});

socialAccountSchema.index({ userId: 1, provider: 1, providerAccountId: 1 }, { unique: true });
socialAccountSchema.index({ userId: 1, connectionStatus: 1 });
socialAccountSchema.index({ provider: 1, providerAccountId: 1 });

module.exports = mongoose.models.SocialAccount || mongoose.model('SocialAccount', socialAccountSchema);
