const fs = require('node:fs');
const path = require('node:path');
const { UPLOADS_ROOT } = require('../../controllers/media/mediaController');
const { validatePublicHttpUrl } = require('../../utils/tokenCrypto');

class PublisherError extends Error {
  constructor(message, { code = 'PLATFORM_API_ERROR', retryable = false } = {}) {
    super(message);
    this.name = 'PublisherError';
    this.code = code;
    this.retryable = retryable;
  }
}

function classifyHttpError(status, detail) {
  if (status === 401 || status === 403) {
    return new PublisherError(detail || 'Authentication expired or permission denied. Please reconnect your account.', {
      code: 'TOKEN_EXPIRED',
      retryable: false,
    });
  }
  if (status === 429 || status >= 500) {
    return new PublisherError(detail || `Platform temporarily unavailable (HTTP ${status}).`, {
      code: 'TRANSIENT_ERROR',
      retryable: true,
    });
  }
  return new PublisherError(detail || `Platform rejected post (HTTP ${status}).`, {
    code: 'PLATFORM_API_ERROR',
    retryable: false,
  });
}

/**
 * Resolves a media URL into a binary Buffer + MIME type, reading local `/uploads/media/`
 * files directly from disk without network hops or fetching validated public HTTPS URLs.
 */
async function loadMediaBuffer(mediaUrl) {
  if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
    throw new PublisherError('Invalid media URL.', { code: 'INVALID_MEDIA', retryable: false });
  }

  const localMatch = mediaUrl.match(/\/uploads\/media\/([a-fA-F0-9]{24})\/([a-fA-F0-9-]+\.(jpg|png|webp|gif|mp4))$/);
  if (localMatch) {
    const [, userId, filename, ext] = localMatch;
    const filePath = path.resolve(UPLOADS_ROOT, userId, filename);
    if (!filePath.startsWith(UPLOADS_ROOT + path.sep) || !fs.existsSync(filePath)) {
      throw new PublisherError('Attached uploaded media file was not found.', { code: 'INVALID_MEDIA', retryable: false });
    }
    const extToMime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4' };
    return {
      buffer: fs.readFileSync(filePath),
      mimeType: extToMime[ext] || 'image/jpeg',
      filename,
    };
  }

  const safeUrl = validatePublicHttpUrl(mediaUrl, { allowHttpInDev: true });
  if (!safeUrl) {
    throw new PublisherError('Media URL must be a valid public HTTPS URL.', { code: 'INVALID_MEDIA', retryable: false });
  }

  const res = await fetch(safeUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new PublisherError(`Failed to download attached media (HTTP ${res.status}).`, {
      code: 'TRANSIENT_ERROR',
      retryable: res.status >= 500,
    });
  }
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
    throw new PublisherError('Media file exceeds the 10 MB limit.', { code: 'INVALID_MEDIA', retryable: false });
  }
  return {
    buffer,
    mimeType: res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg',
    filename: 'media',
  };
}

module.exports = {
  PublisherError,
  classifyHttpError,
  loadMediaBuffer,
};
