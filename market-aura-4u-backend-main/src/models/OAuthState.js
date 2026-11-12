const mongoose = require('mongoose');

const oauthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: {
    type: String,
    enum: ['twitter', 'linkedin', 'instagram', 'facebook'],
    required: true,
  },
  codeVerifier: { type: String },
  returnTo: { type: String, default: '/social-accounts' },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
    index: { expires: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.models.OAuthState || mongoose.model('OAuthState', oauthStateSchema);
