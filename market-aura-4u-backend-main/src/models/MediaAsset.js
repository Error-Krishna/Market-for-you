const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  altText: { type: String, default: '', trim: true, maxlength: 500 },
  tags: [{ type: String, trim: true, maxlength: 50 }],
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
  },
  sourceType: {
    type: String,
    enum: ['upload', 'url'],
    required: true,
  },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  storageKey: { type: String, default: null },
  mimeType: { type: String, default: 'image/jpeg' },
  sizeBytes: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.storageKey;
      return ret;
    },
  },
});

mediaAssetSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
