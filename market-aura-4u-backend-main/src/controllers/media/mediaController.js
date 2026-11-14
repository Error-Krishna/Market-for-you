const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const MediaAsset = require('../../models/MediaAsset');
const ScheduledPost = require('../../models/ScheduledPost');
const { validatePublicHttpUrl } = require('../../utils/tokenCrypto');
const { getStorageProvider } = require('../../services/storage/storageProvider');
const { getStorageConfig } = require('../../services/storage/storageConfig');

const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads', 'media');

const MIME_TO_EXT = {
  'image/jpeg': { ext: 'jpg', mediaType: 'image' },
  'image/jpg': { ext: 'jpg', mediaType: 'image' },
  'image/png': { ext: 'png', mediaType: 'image' },
  'image/webp': { ext: 'webp', mediaType: 'image' },
  'image/gif': { ext: 'gif', mediaType: 'image' },
  'video/mp4': { ext: 'mp4', mediaType: 'video' },
};

function matchesMagicBytes(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mimeType === 'video/mp4') {
    return buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  return false;
}

function parseDataPayload(dataBase64, declaredMime, maxBytes = 10 * 1024 * 1024) {
  let mimeType = declaredMime ? String(declaredMime).trim().toLowerCase() : undefined;
  let base64Body = dataBase64;
  if (typeof dataBase64 === 'string' && dataBase64.startsWith('data:')) {
    const match = dataBase64.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/s);
    if (!match) return { error: 'Malformed data URL payload.' };
    mimeType = mimeType || match[1].trim().toLowerCase();
    base64Body = match[2];
  }
  if (mimeType === 'image/jpg') {
    mimeType = 'image/jpeg';
  }
  const spec = MIME_TO_EXT[mimeType];
  if (!spec) {
    return { error: 'Unsupported media type. Allowed: JPEG, PNG, WebP, GIF, MP4.' };
  }
  if (typeof base64Body !== 'string' || !base64Body.trim()) {
    return { error: 'Media file content is required.' };
  }
  const cleanedBase64 = base64Body.replace(/\s+/g, '');
  const buffer = Buffer.from(cleanedBase64, 'base64');
  if (buffer.length === 0 || buffer.length > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return { error: `Media file must be between 1 byte and ${maxMb} MB.` };
  }
  if (!matchesMagicBytes(buffer, mimeType)) {
    return { error: 'File contents do not match the declared media type.' };
  }
  return { buffer, mimeType, ext: spec.ext, mediaType: spec.mediaType };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .filter((tag) => typeof tag === 'string' && tag.trim())
      .map((tag) => tag.trim().slice(0, 50))
  )].slice(0, 15);
}

const listMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const filter = { userId };
    if (req.query.mediaType && ['image', 'video'].includes(req.query.mediaType)) {
      filter.mediaType = req.query.mediaType;
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const escaped = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: new RegExp(escaped, 'i') },
        { altText: new RegExp(escaped, 'i') },
        { tags: new RegExp(escaped, 'i') },
      ];
    }

    const items = await MediaAsset.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({ success: true, count: items.length, media: items });
  } catch (error) {
    console.error('List media failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch media library' });
  }
};

const createMedia = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { title, altText = '', tags = [], url, dataBase64, mimeType, mediaType } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Media title is required.' });
    }

    const { limits } = getStorageConfig();

    let finalUrl;
    let storageKey = null;
    let storageProviderName = 'local';
    let finalMime = mimeType || 'image/jpeg';
    let finalMediaType = mediaType === 'video' ? 'video' : 'image';
    let sizeBytes = 0;
    let sourceType;

    if (dataBase64) {
      if (!limits.uploadsEnabled) {
        return res.status(503).json({
          success: false,
          code: 'UPLOADS_DISABLED',
          message: 'Media uploads are temporarily disabled by the administrator.',
        });
      }

      const parsed = parseDataPayload(dataBase64, mimeType, limits.maxUploadBytes);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      // Quota check: monthly upload operations limit & storage quota check
      if (mongoose.connection.readyState === 1 || (MediaAsset.countDocuments && MediaAsset.countDocuments.mock)) {
        const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
        const monthlyCount = await MediaAsset.countDocuments({
          userId,
          sourceType: 'upload',
          createdAt: { $gte: startOfMonth },
        });
        if (monthlyCount >= limits.monthlyUploadLimit) {
          return res.status(429).json({
            success: false,
            code: 'MONTHLY_UPLOAD_LIMIT_EXCEEDED',
            message: `Monthly upload limit of ${limits.monthlyUploadLimit} files reached. Please upgrade your plan or wait for the next billing cycle.`,
          });
        }

        if (typeof MediaAsset.aggregate === 'function') {
          const userBytesAgg = await MediaAsset.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalBytes: { $sum: '$sizeBytes' } } },
          ]);
          const currentBytes = userBytesAgg[0]?.totalBytes || 0;
          if (currentBytes + parsed.buffer.length > limits.userStorageQuotaBytes) {
            const quotaMb = Math.round(limits.userStorageQuotaBytes / (1024 * 1024));
            return res.status(413).json({
              success: false,
              code: 'STORAGE_QUOTA_EXCEEDED',
              message: `Storage quota exceeded. Your account has a maximum storage limit of ${quotaMb} MB.`,
            });
          }
        }
      }

      // Duplicate upload check: reuse existing asset if identical title, size, and mime exist
      if (mongoose.connection.readyState === 1 || (MediaAsset.findOne && MediaAsset.findOne.mock)) {
        const existingDuplicate = await MediaAsset.findOne({
          userId,
          title: title.trim().slice(0, 160),
          sizeBytes: parsed.buffer.length,
          mimeType: parsed.mimeType,
        });
        if (existingDuplicate) {
          return res.status(200).json({
            success: true,
            message: 'Existing media asset reused.',
            media: existingDuplicate,
            duplicateReused: true,
          });
        }
      }

      sourceType = 'upload';
      finalMime = parsed.mimeType;
      finalMediaType = parsed.mediaType;
      sizeBytes = parsed.buffer.length;

      const provider = getStorageProvider();
      const rawKey = provider.buildStorageKey({ userId, ext: parsed.ext });
      const uploadResult = await provider.upload({
        buffer: parsed.buffer,
        key: rawKey,
        contentType: finalMime,
        metadata: { userId, title: title.slice(0, 50) },
        req,
      });
      storageKey = uploadResult.key;
      finalUrl = uploadResult.url;
      storageProviderName = uploadResult.provider || provider.name;
    } else if (url) {
      const validated = validatePublicHttpUrl(url, { allowHttpInDev: true });
      if (!validated) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid public HTTPS media URL.',
        });
      }
      sourceType = 'url';
      storageProviderName = 'url';
      finalUrl = validated;
      if (/\.(mp4|mov|webm)(\?|$)/i.test(validated)) finalMediaType = 'video';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either an uploaded file or a valid media URL.',
      });
    }

    let asset;
    try {
      asset = await MediaAsset.create({
        userId,
        title: title.trim().slice(0, 160),
        altText: typeof altText === 'string' ? altText.trim().slice(0, 500) : '',
        tags: normalizeTags(tags),
        mediaType: finalMediaType,
        sourceType,
        storageProvider: storageProviderName,
        url: finalUrl,
        storageKey,
        mimeType: finalMime,
        sizeBytes,
      });
    } catch (dbErr) {
      // Clean up orphaned upload if database persistence fails
      if (storageKey) {
        const provider = getStorageProvider(storageProviderName);
        await provider.delete(storageKey).catch(() => {});
      }
      throw dbErr;
    }

    return res.status(201).json({ success: true, message: 'Media asset saved', media: asset });
  } catch (error) {
    console.error('Create media failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to save media asset' });
  }
};

const updateMedia = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid media ID.' });
    }
    const userId = String(req.user.id);
    const asset = await MediaAsset.findOne({ _id: req.params.id, userId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Media asset not found' });
    }

    const { limits } = getStorageConfig();
    const { title, altText, tags, url, dataBase64, mimeType, mediaType } = req.body || {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Media title cannot be empty.' });
      }
      asset.title = title.trim().slice(0, 160);
    }
    if (altText !== undefined) {
      asset.altText = typeof altText === 'string' ? altText.trim().slice(0, 500) : '';
    }
    if (tags !== undefined) {
      asset.tags = normalizeTags(tags);
    }

    if (dataBase64) {
      if (!limits.uploadsEnabled) {
        return res.status(503).json({
          success: false,
          code: 'UPLOADS_DISABLED',
          message: 'Media uploads are temporarily disabled by the administrator.',
        });
      }
      const parsed = parseDataPayload(dataBase64, mimeType, limits.maxUploadBytes);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }

      const provider = getStorageProvider();
      const newKey = provider.buildStorageKey({ userId, ext: parsed.ext });
      const uploadResult = await provider.upload({
        buffer: parsed.buffer,
        key: newKey,
        contentType: parsed.mimeType,
        metadata: { userId, title: asset.title.slice(0, 50) },
        req,
      });

      const oldKey = asset.storageKey;
      const oldProviderName = asset.storageProvider || 'local';

      asset.sourceType = 'upload';
      asset.storageKey = uploadResult.key;
      asset.url = uploadResult.url;
      asset.storageProvider = uploadResult.provider || provider.name;
      asset.mimeType = parsed.mimeType;
      asset.mediaType = parsed.mediaType;
      asset.sizeBytes = parsed.buffer.length;

      try {
        await asset.save();
        if (oldKey) {
          const oldProvider = getStorageProvider(oldProviderName);
          await oldProvider.delete(oldKey).catch(() => {});
        }
      } catch (saveErr) {
        // Clean up new upload if save failed
        await provider.delete(uploadResult.key).catch(() => {});
        throw saveErr;
      }
    } else if (url !== undefined && url !== asset.url) {
      const validated = validatePublicHttpUrl(url, { allowHttpInDev: true });
      if (!validated) {
        return res.status(400).json({ success: false, message: 'Provide a valid public HTTPS media URL.' });
      }
      if (asset.storageKey) {
        const oldProvider = getStorageProvider(asset.storageProvider || 'local');
        await oldProvider.delete(asset.storageKey).catch(() => {});
      }
      asset.sourceType = 'url';
      asset.storageKey = null;
      asset.storageProvider = 'url';
      asset.url = validated;
      asset.sizeBytes = 0;
      if (mediaType && ['image', 'video'].includes(mediaType)) {
        asset.mediaType = mediaType;
      }
      await asset.save();
    } else {
      await asset.save();
    }

    return res.status(200).json({ success: true, message: 'Media asset updated', media: asset });
  } catch (error) {
    console.error('Update media failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update media asset' });
  }
};

const deleteMedia = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid media ID.' });
    }
    const userId = String(req.user.id);

    // Active scheduled post check: prevent deleting asset if referenced by scheduled/processing posts
    if (mongoose.connection.readyState === 1 || (ScheduledPost.findOne && ScheduledPost.findOne.mock)) {
      const activePost = await ScheduledPost.findOne({
        userId,
        status: { $in: ['scheduled', 'processing'] },
        'platforms.mediaAssetIds': req.params.id,
      });
      if (activePost) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete media asset because it is referenced by an active scheduled post.',
        });
      }
    }

    const asset = await MediaAsset.findOneAndDelete({ _id: req.params.id, userId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Media asset not found' });
    }
    if (asset.storageKey) {
      const provider = getStorageProvider(asset.storageProvider || 'local');
      await provider.delete(asset.storageKey);
    }
    return res.status(200).json({ success: true, message: 'Media asset deleted' });
  } catch (error) {
    console.error('Delete media failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete media asset' });
  }
};

const serveUploadedMedia = (req, res) => {
  const { userId, filename } = req.params;
  if (!/^[a-fA-F0-9]{24}$/.test(userId) || !/^[a-fA-F0-9-]+\.(jpg|png|webp|gif|mp4)$/.test(filename)) {
    return res.status(404).json({ success: false, message: 'Media not found' });
  }
  const filePath = path.resolve(UPLOADS_ROOT, userId, filename);
  if (!filePath.startsWith(UPLOADS_ROOT + path.sep) || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Media not found' });
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(filePath);
};

module.exports = {
  listMedia,
  createMedia,
  updateMedia,
  deleteMedia,
  serveUploadedMedia,
  UPLOADS_ROOT,
};
