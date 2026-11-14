/**
 * Configuration and validation for media storage providers (Cloudflare R2 and Local).
 */

function sanitizeR2Endpoint(customEndpoint, accountId) {
  let ep = (customEndpoint || '').trim();
  if (!ep && accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  if (!ep) return '';
  if (ep.includes('.r2.cloudflarestorage.com')) {
    ep = ep.replace(/\.r2\.cloudflarestorage\.com\/.*$/, '.r2.cloudflarestorage.com');
  }
  return ep.replace(/\/+$/, '');
}

function getStorageConfig() {
  const provider = (process.env.MEDIA_STORAGE_PROVIDER || '').trim().toLowerCase();
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const customEndpoint = (process.env.R2_ENDPOINT || '').trim();
  // Standardize canonical variable R2_PUBLIC_BASE_URL with fallback to R2_PUBLIC_URL
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || '').trim();
  const prefix = (process.env.MEDIA_STORAGE_PREFIX || 'media').trim().replace(/^\/+|\/+$/g, '');
  const region = (process.env.R2_REGION || 'auto').trim();

  // Application-level usage and billing safeguards
  const uploadsEnabled = process.env.MEDIA_UPLOADS_ENABLED !== 'false' && process.env.MEDIA_UPLOADS_ENABLED !== '0';
  const maxUploadBytes = Number.parseInt(process.env.MEDIA_MAX_UPLOAD_BYTES, 10) || 10 * 1024 * 1024;
  const userStorageQuotaBytes = Number.parseInt(process.env.MEDIA_USER_STORAGE_QUOTA_BYTES, 10) || 100 * 1024 * 1024;
  const monthlyUploadLimit = Number.parseInt(process.env.MEDIA_USER_MONTHLY_UPLOAD_LIMIT, 10) || 100;

  const hasR2Credentials = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

  let activeProvider = 'local';
  if (provider === 'r2') {
    activeProvider = 'r2';
  } else if (!provider && hasR2Credentials) {
    activeProvider = 'r2';
  } else if (provider === 'local') {
    activeProvider = 'local';
  }

  const endpoint = sanitizeR2Endpoint(customEndpoint, accountId);

  return {
    provider: activeProvider,
    r2: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      endpoint,
      region,
      publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
      prefix,
    },
    limits: {
      uploadsEnabled,
      maxUploadBytes,
      userStorageQuotaBytes,
      monthlyUploadLimit,
    },
    hasR2Credentials,
  };
}

function validateR2Config(config = getStorageConfig()) {
  const missing = [];
  if (!config.r2.accountId) missing.push('R2_ACCOUNT_ID');
  if (!config.r2.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.r2.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!config.r2.bucketName) missing.push('R2_BUCKET_NAME');
  if (!config.r2.publicBaseUrl) missing.push('R2_PUBLIC_BASE_URL');

  if (missing.length > 0) {
    throw new Error(`Cloudflare R2 configuration error: missing required environment variables: ${missing.join(', ')}`);
  }

  if (!config.r2.publicBaseUrl.startsWith('https://')) {
    throw new Error('Cloudflare R2 configuration error: R2_PUBLIC_BASE_URL must be an HTTPS URL.');
  }
}

module.exports = {
  getStorageConfig,
  validateR2Config,
  sanitizeR2Endpoint,
};
