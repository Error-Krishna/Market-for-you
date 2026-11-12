const crypto = require('node:crypto');
const net = require('node:net');

function resolveEncryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw && raw.trim()) {
    const trimmed = raw.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }
    return crypto.createHash('sha256').update(trimmed).digest();
  }
  const fallbackSecret = process.env.JWT_SECREAT_KEY || 'market-aura-dev-only-token-key';
  return crypto.createHash('sha256').update(`token-enc:${fallbackSecret}`).digest();
}

function encryptSecret(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) return null;
  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(payload) {
  if (typeof payload !== 'string' || !payload.includes('.')) return null;
  const parts = payload.split('.');
  if (parts.length !== 3) return null;
  try {
    const [ivB64, tagB64, dataB64] = parts;
    const key = resolveEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function isPrivateOrLoopbackHost(hostname) {
  const lower = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!lower || lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) {
    return true;
  }
  const ipVersion = net.isIP(lower);
  if (ipVersion === 4) {
    const parts = lower.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  } else if (ipVersion === 6) {
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    if (lower.startsWith('::ffff:')) {
      return isPrivateOrLoopbackHost(lower.slice('::ffff:'.length));
    }
  }
  return false;
}

function validatePublicHttpUrl(rawUrl, { allowHttpInDev = false } = {}) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const allowedProtocols = allowHttpInDev && process.env.NODE_ENV !== 'production'
    ? ['https:', 'http:']
    : ['https:'];
  if (!allowedProtocols.includes(parsed.protocol)) return null;
  if (parsed.username || parsed.password) return null;
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return null;
  }
  return parsed.href;
}

module.exports = {
  encryptSecret,
  decryptSecret,
  isPrivateOrLoopbackHost,
  validatePublicHttpUrl,
};
