const crypto = require('node:crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { sanitizeR2Endpoint } = require('./storageConfig');

class R2StorageProvider {
  constructor(config = {}) {
    this.name = 'r2';
    this.bucketName = config.bucketName || process.env.R2_BUCKET_NAME || '';
    this.publicBaseUrl = (config.publicBaseUrl || process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
    this.prefix = (config.prefix || process.env.MEDIA_STORAGE_PREFIX || 'media').replace(/^\/+|\/+$/g, '');

    if (config.s3Client) {
      this.s3Client = config.s3Client;
    } else {
      const accountId = config.accountId || process.env.R2_ACCOUNT_ID;
      const endpoint = sanitizeR2Endpoint(config.endpoint || process.env.R2_ENDPOINT, accountId) || undefined;
      const region = config.region || process.env.R2_REGION || 'auto';
      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: config.accessKeyId || process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  buildStorageKey({ userId, ext }) {
    const cleanExt = (ext || 'jpg').replace(/^\./, '').toLowerCase();
    const cleanUserId = String(userId).trim();
    const uuid = crypto.randomUUID();
    return `${this.prefix}/users/${cleanUserId}/media/${uuid}.${cleanExt}`;
  }

  getPublicUrl(key) {
    if (!key || typeof key !== 'string') return '';
    const cleanKey = key.replace(/^\/+/, '');
    if (!this.publicBaseUrl) {
      throw new Error('R2_PUBLIC_BASE_URL is not configured. Cannot construct canonical public media URL.');
    }
    return `${this.publicBaseUrl}/${cleanKey}`;
  }

  async upload({ buffer, key, contentType, metadata = {} }) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Upload body must be a Buffer.');
    }
    if (!key || typeof key !== 'string') {
      throw new TypeError('Upload storage key is required.');
    }

    const sanitizedMetadata = {};
    if (metadata && typeof metadata === 'object') {
      for (const [k, v] of Object.entries(metadata)) {
        if (typeof v === 'string' || typeof v === 'number') {
          sanitizedMetadata[k.toLowerCase().replace(/[^a-z0-9_-]/g, '')] = String(v);
        }
      }
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      ContentLength: buffer.length,
      Metadata: Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : undefined,
    });

    await this.s3Client.send(command);

    return {
      key,
      url: this.getPublicUrl(key),
      provider: 'r2',
      contentType: contentType || 'application/octet-stream',
      size: buffer.length,
    };
  }

  async delete(key) {
    if (!key || typeof key !== 'string') return;
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async head(key) {
    if (!key || typeof key !== 'string') return null;
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return this.s3Client.send(command);
  }
}

module.exports = R2StorageProvider;
