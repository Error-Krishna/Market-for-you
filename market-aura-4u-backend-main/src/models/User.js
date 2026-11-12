const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Auth ---
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // --- App Logic ---
  onboardingCompleted: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  timezone: { type: String, default: 'UTC' },

  settings: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
    },
  },

  credits: {
    monthly: { type: Number, default: 100 },
    used: { type: Number, default: 0 }
  },

  // --- Brand Profile ---
  brandProfile: {
    companyName: { type: String, default: '' },
    industry: { type: String, default: '' },
    description: { type: String, default: '' },
    uvp: { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    marketingGoal: { type: String, default: '' },

    brandVoice: {
      tone: { type: String, default: 'Professional' },
      description: { type: String, default: '' }
    },

    platforms: [{
      type: String,
      enum: ['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog']
    }]
  },
  subscription: {
    status: { type: String, default: 'free' }, // free, active
    plan: { type: String, default: 'starter' },
    startDate: { type: Date },
    paymentId: { type: String }
  },
  socialAccounts: {
    instagram: {
      instagramId: { type: String },
      username: { type: String },
      accountType: { type: String },
      accessToken: { type: String },
      accessTokenEnc: { type: String },
      expiresAt: { type: Date },
      connectedAt: { type: Date },
      isConnected: { type: Boolean, default: false }
    },
    twitter: {
      twitterUserId: { type: String },
      username: { type: String },
      name: { type: String },
      accessTokenEnc: { type: String },
      refreshTokenEnc: { type: String },
      expiresAt: { type: Date },
      connectedAt: { type: Date },
      isConnected: { type: Boolean, default: false }
    },
    linkedin: {
      memberUrn: { type: String },
      name: { type: String },
      email: { type: String },
      accessTokenEnc: { type: String },
      refreshTokenEnc: { type: String },
      expiresAt: { type: Date },
      connectedAt: { type: Date },
      isConnected: { type: Boolean, default: false }
    },
    facebook: {
      pageId: { type: String },
      pageName: { type: String },
      userAccessTokenEnc: { type: String },
      pageAccessTokenEnc: { type: String },
      pages: [{
        id: { type: String },
        name: { type: String },
        accessTokenEnc: { type: String }
      }],
      expiresAt: { type: Date },
      connectedAt: { type: Date },
      isConnected: { type: Boolean, default: false }
    },
    email: {
      provider: { type: String, enum: ['resend', 'sendgrid', 'webhook'] },
      fromName: { type: String },
      fromEmail: { type: String },
      defaultRecipients: [{ type: String }],
      webhookUrl: { type: String },
      secretEnc: { type: String },
      connectedAt: { type: Date },
      isConnected: { type: Boolean, default: false }
    },
    blog: {
      provider: { type: String, enum: ['wordpress', 'hashnode', 'ghost', 'webhook'] },
      siteUrl: { type: String },
      username: { type: String },
      publicationId: { type: String },
      secretEnc: { type: String },
      connectedAt: { type: Date },
      isConnected: { type: Boolean, default: false }
    }
  }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
