const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const MediaAsset = require('../../models/MediaAsset');
const { validatePublicHttpUrl } = require('../../utils/tokenCrypto');

const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads', 'media');
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB

const MIME_TO_EXT = {
  'image/jpeg': { ext: 'jpg', mediaType: 'image' },
  'image/png': { ext: 'png', mediaType: 'image' },
  'image/webp': { ext: 'webp', mediaType: 'image' },
  'image/gif': { ext: 'gif', mediaType: 'image' },
  'video/mp4': { ext: 'mp4', mediaType: 'video' },
};

function matchesMagicBytes(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  if (mimeType === 'image/jpeg') {
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

function getBaseBackendUrl(req) {
  const configured = process.env.PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 8000}`;
  return `${protocol}://${host}`;
}

function parseDataPayload(dataBase64, declaredMime) {
  let mimeType = declaredMime;
  let base64Body = dataBase64;
  if (typeof dataBase64 === 'string' && dataBase64.startsWith('data:')) {
    const match = dataBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { error: 'Malformed data URL payload.' };
    mimeType = mimeType || match[1];
    base64Body = match[2];
  }
  const spec = MIME_TO_EXT[mimeType];
  if (!spec) {
    return { error: 'Unsupported media type. Allowed: JPEG, PNG, WebP, GIF, MP4.' };
  }
  if (typeof base64Body !== 'string' || !base64Body.trim()) {
    return { error: 'Media file content is required.' };
  }
  const buffer = Buffer.from(base64Body, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    return { error: 'Media file must be between 1 byte and 10 MB.' };
  }
  if (!matchesMagicBytes(buffer, mimeType)) {
    return { error: 'File contents do not match the declared media type.' };
  }
  return { buffer, mimeType, ...spec };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .filter((tag) => typeof tag === 'string' && tag.trim())
      .map((tag) => tag.trim().slice(0, 50))
  )].slice(0, 15);
}

function removeStoredFile(storageKey) {
  if (!storageKey) return;
  const fullPath = path.resolve(UPLOADS_ROOT, storageKey);
  if (!fullPath.startsWith(UPLOADS_ROOT + path.sep)) return;
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.warn('Media file cleanup warning:', err.message);
  }
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

    let finalUrl;
    let storageKey = null;
    let finalMime = mimeType || 'image/jpeg';
    let finalMediaType = mediaType === 'video' ? 'video' : 'image';
    let sizeBytes = 0;
    let sourceType;

    if (dataBase64) {
      const parsed = parseDataPayload(dataBase64, mimeType);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }
      sourceType = 'upload';
      finalMime = parsed.mimeType;
      finalMediaType = parsed.mediaType;
      sizeBytes = parsed.buffer.length;

      const userDir = path.join(UPLOADS_ROOT, userId);
      fs.mkdirSync(userDir, { recursive: true });
      const fileName = `${crypto.randomUUID()}.${parsed.ext}`;
      storageKey = path.join(userId, fileName);
      fs.writeFileSync(path.join(UPLOADS_ROOT, storageKey), parsed.buffer);
      finalUrl = `${getBaseBackendUrl(req)}/uploads/media/${userId}/${fileName}`;
    } else if (url) {
      const validated = validatePublicHttpUrl(url, { allowHttpInDev: true });
      if (!validated) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid public HTTPS media URL.',
        });
      }
      sourceType = 'url';
      finalUrl = validated;
      if (/\.(mp4|mov|webm)(\?|$)/i.test(validated)) finalMediaType = 'video';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either an uploaded file or a valid media URL.',
      });
    }

    const asset = await MediaAsset.create({
      userId,
      title: title.trim().slice(0, 160),
      altText: typeof altText === 'string' ? altText.trim().slice(0, 500) : '',
      tags: normalizeTags(tags),
      mediaType: finalMediaType,
      sourceType,
      url: finalUrl,
      storageKey,
      mimeType: finalMime,
      sizeBytes,
    });

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
      const parsed = parseDataPayload(dataBase64, mimeType);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }
      removeStoredFile(asset.storageKey);
      const userDir = path.join(UPLOADS_ROOT, userId);
      fs.mkdirSync(userDir, { recursive: true });
      const fileName = `${crypto.randomUUID()}.${parsed.ext}`;
      const newKey = path.join(userId, fileName);
      fs.writeFileSync(path.join(UPLOADS_ROOT, newKey), parsed.buffer);

      asset.sourceType = 'upload';
      asset.storageKey = newKey;
      asset.url = `${getBaseBackendUrl(req)}/uploads/media/${userId}/${fileName}`;
      asset.mimeType = parsed.mimeType;
      asset.mediaType = parsed.mediaType;
      asset.sizeBytes = parsed.buffer.length;
    } else if (url !== undefined && url !== asset.url) {
      const validated = validatePublicHttpUrl(url, { allowHttpInDev: true });
      if (!validated) {
        return res.status(400).json({ success: false, message: 'Provide a valid public HTTPS media URL.' });
      }
      removeStoredFile(asset.storageKey);
      asset.sourceType = 'url';
      asset.storageKey = null;
      asset.url = validated;
      asset.sizeBytes = 0;
      if (mediaType && ['image', 'video'].includes(mediaType)) {
        asset.mediaType = mediaType;
      }
    }

    await asset.save();
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
    const asset = await MediaAsset.findOneAndDelete({ _id: req.params.id, userId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Media asset not found' });
    }
    removeStoredFile(asset.storageKey);
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
