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

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MiB

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
};

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

function deriveRemoteFilename(safeUrl, mimeType) {
  let rawBase;
  try {
    rawBase = path.basename(new URL(safeUrl).pathname || '');
  } catch {
    rawBase = '';
  }
  const cleaned = rawBase.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
  const extFromMime = MIME_TO_EXT[String(mimeType || '').toLowerCase()] || 'bin';
  if (cleaned && /\.[a-zA-Z0-9]{2,5}$/.test(cleaned)) {
    return cleaned;
  }
  const stem = cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : 'media';
  return `${stem}.${extFromMime}`;
}

/**
 * Resolves a media URL into a binary Buffer + MIME type, reading local `/uploads/media/`
 * files directly from disk without network hops or fetching validated public HTTPS URLs.
 */
async function loadMediaBuffer(mediaUrl) {
  if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
    throw new PublisherError('Invalid media URL.', { code: 'INVALID_MEDIA', retryable: false });
  }

  const trimmedUrl = mediaUrl.trim();
  let pathCandidate = trimmedUrl;
  if (/^https?:\/\//i.test(trimmedUrl)) {
    try {
      pathCandidate = new URL(trimmedUrl).pathname;
    } catch {
      pathCandidate = trimmedUrl;
    }
  }

  const localMatch = pathCandidate.match(/\/uploads\/media\/([a-fA-F0-9]{24})\/([a-fA-F0-9-]+\.(jpg|jpeg|png|webp|gif|mp4))$/i);
  if (localMatch) {
    const [, userId, filename, ext] = localMatch;
    const filePath = path.resolve(UPLOADS_ROOT, userId, filename);
    if (!filePath.startsWith(UPLOADS_ROOT + path.sep) || !fs.existsSync(filePath)) {
      throw new PublisherError('Attached uploaded media file was not found.', { code: 'INVALID_MEDIA', retryable: false });
    }
    const buffer = fs.readFileSync(filePath);
    if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) {
      throw new PublisherError('Media file must be between 1 byte and 10 MB.', { code: 'INVALID_MEDIA', retryable: false });
    }
    return {
      buffer,
      mimeType: EXT_TO_MIME[ext.toLowerCase()] || 'image/jpeg',
      filename,
    };
  }

  const safeUrl = validatePublicHttpUrl(trimmedUrl, { allowHttpInDev: true });
  if (!safeUrl) {
    throw new PublisherError('Media URL must be a valid public HTTPS URL.', { code: 'INVALID_MEDIA', retryable: false });
  }

  let res;
  try {
    res = await fetch(safeUrl, { signal: AbortSignal.timeout(15000) });
  } catch (err) {
    throw new PublisherError(`Failed to download attached media: ${err.message}`, {
      code: 'TRANSIENT_ERROR',
      retryable: true,
    });
  }
  if (!res.ok) {
    throw new PublisherError(`Failed to download attached media (HTTP ${res.status}).`, {
      code: 'TRANSIENT_ERROR',
      retryable: res.status >= 500,
    });
  }
  const declaredLen = Number(res.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLen) && declaredLen > MAX_MEDIA_BYTES) {
    throw new PublisherError('Media file exceeds the 10 MB limit.', { code: 'INVALID_MEDIA', retryable: false });
  }
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) {
    throw new PublisherError('Media file exceeds the 10 MB limit.', { code: 'INVALID_MEDIA', retryable: false });
  }
  const rawHeaderMime = res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
  const candidateFilename = deriveRemoteFilename(safeUrl, rawHeaderMime || 'application/octet-stream');
  const extFromName = path.extname(candidateFilename).slice(1).toLowerCase();
  const mimeType = (rawHeaderMime && rawHeaderMime !== 'application/octet-stream')
    ? rawHeaderMime
    : (EXT_TO_MIME[extFromName] || 'application/octet-stream');
  return {
    buffer,
    mimeType,
    filename: deriveRemoteFilename(safeUrl, mimeType),
  };
}

module.exports = {
  PublisherError,
  classifyHttpError,
  loadMediaBuffer,
};
