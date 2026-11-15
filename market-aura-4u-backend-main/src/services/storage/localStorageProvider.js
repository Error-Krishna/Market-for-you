const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PRIMARY_UPLOADS_ROOT = path.resolve(__dirname, '..', '..', '..', 'uploads', 'media');
const LEGACY_UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads', 'media');

// Ensure primary directory exists if writable
try {
  if (!fs.existsSync(PRIMARY_UPLOADS_ROOT)) {
    fs.mkdirSync(PRIMARY_UPLOADS_ROOT, { recursive: true });
  }
} catch {
  // Graceful on read-only environments
}

const UPLOADS_ROOT = PRIMARY_UPLOADS_ROOT;

function getBaseBackendUrl(req) {
  const configured = process.env.PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const protocol = req?.protocol || 'http';
  const host = req?.get ? (req.get('host') || `localhost:${process.env.PORT || 8000}`) : `localhost:${process.env.PORT || 8000}`;
  return `${protocol}://${host}`;
}

class LocalStorageProvider {
  constructor() {
    this.name = 'local';
    this.uploadsRoot = UPLOADS_ROOT;
    this.legacyUploadsRoot = LEGACY_UPLOADS_ROOT;
  }

  buildStorageKey({ userId, ext }) {
    const cleanExt = (ext || 'jpg').replace(/^\./, '').toLowerCase();
    const cleanUserId = String(userId).trim();
    const fileName = `${crypto.randomUUID()}.${cleanExt}`;
    return path.join(cleanUserId, fileName);
  }

  getPublicUrl(key, req) {
    if (!key || typeof key !== 'string') return '';
    const base = getBaseBackendUrl(req);
    const normalizedKey = key.split(path.sep).join('/');
    return `${base}/uploads/media/${normalizedKey}`;
  }

  async upload({ buffer, key, contentType, req }) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Upload body must be a Buffer.');
    }
    if (!key || typeof key !== 'string') {
      throw new TypeError('Upload storage key is required.');
    }

    const fullPath = path.resolve(this.uploadsRoot, key);
    if (!fullPath.startsWith(this.uploadsRoot + path.sep)) {
      throw new Error('Path traversal detected in local storage key.');
    }

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);

    return {
      key,
      url: this.getPublicUrl(key, req),
      provider: 'local',
      contentType: contentType || 'application/octet-stream',
      size: buffer.length,
    };
  }

  async delete(key) {
    if (!key || typeof key !== 'string') return;
    const candidates = [
      path.resolve(this.uploadsRoot, key),
      path.resolve(this.legacyUploadsRoot, key),
    ];
    for (const fullPath of candidates) {
      const isAllowed = fullPath.startsWith(this.uploadsRoot + path.sep)
        || fullPath.startsWith(this.legacyUploadsRoot + path.sep);
      if (isAllowed) {
        try {
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (err) {
          console.warn('Local storage delete warning:', err.message);
        }
      }
    }
  }

  async head(key) {
    if (!key || typeof key !== 'string') return null;
    const candidates = [
      path.resolve(this.uploadsRoot, key),
      path.resolve(this.legacyUploadsRoot, key),
    ];
    for (const fullPath of candidates) {
      const isAllowed = fullPath.startsWith(this.uploadsRoot + path.sep)
        || fullPath.startsWith(this.legacyUploadsRoot + path.sep);
      if (isAllowed && fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        return { ContentLength: stat.size };
      }
    }
    return null;
  }
}

module.exports = LocalStorageProvider;
