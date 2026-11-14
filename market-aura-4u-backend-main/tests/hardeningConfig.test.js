const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getJwtSecret, resolveEncryptionKey } = require('../src/utils/tokenCrypto');
const readRecommenderConfig = require('../src/config/recommender');
const { getDbConnectionOptions } = require('../src/config/db');
const {
  UPLOADS_ROOT,
  PRIMARY_UPLOADS_ROOT,
  LEGACY_UPLOADS_ROOT,
  serveUploadedMedia,
} = require('../src/controllers/media/mediaController');
const LocalStorageProvider = require('../src/services/storage/localStorageProvider');

test('Hardening: getJwtSecret supports canonical and alias keys with production fail-fast', () => {
  // 1. Canonical key works
  const secret1 = getJwtSecret({ JWT_SECREAT_KEY: 'test-secret-canonical-123456789012' });
  assert.equal(secret1, 'test-secret-canonical-123456789012');

  // 2. Alias key works
  const secret2 = getJwtSecret({ JWT_SECRET_KEY: 'test-secret-alias-123456789012345' });
  assert.equal(secret2, 'test-secret-alias-123456789012345');

  // 3. Canonical takes precedence if both present
  const secret3 = getJwtSecret({
    JWT_SECREAT_KEY: 'canonical-key-takes-priority-32chars',
    JWT_SECRET_KEY: 'alias-key-ignored-in-priority-check',
  });
  assert.equal(secret3, 'canonical-key-takes-priority-32chars');

  // 4. In production, missing secret throws fail-fast error
  assert.throws(
    () => getJwtSecret({ NODE_ENV: 'production' }),
    /JWT_SECREAT_KEY or JWT_SECRET_KEY environment variable is required in production/
  );
});

test('Hardening: resolveEncryptionKey enforces 32-byte hex key in production', () => {
  const validHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = resolveEncryptionKey({ TOKEN_ENCRYPTION_KEY: validHexKey });
  assert.equal(key.toString('hex'), validHexKey);

  // In production, missing key throws
  assert.throws(
    () => resolveEncryptionKey({ NODE_ENV: 'production' }),
    /TOKEN_ENCRYPTION_KEY or JWT_SECREAT_KEY is required in production/
  );

  // In production, insecure placeholder throws
  assert.throws(
    () => resolveEncryptionKey({
      NODE_ENV: 'production',
      TOKEN_ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
    }),
    /insecure placeholder/
  );
});

test('Hardening: recommender allows internal hostnames for unauthenticated access', () => {
  // Loopback
  const loopbackConfig = readRecommenderConfig({ RECOMMENDER_URL: 'http://127.0.0.1:8080/recommend' });
  assert.equal(loopbackConfig.recommend, 'http://127.0.0.1:8080/recommend');
  assert.equal(loopbackConfig.authMode, 'none');

  // Docker service hostname
  const dockerConfig = readRecommenderConfig({ RECOMMENDER_URL: 'http://ml-recommender:8080/recommend' });
  assert.equal(dockerConfig.recommend, 'http://ml-recommender:8080/recommend');
  assert.equal(dockerConfig.authMode, 'none');

  // Render internal service hostname
  const renderConfig = readRecommenderConfig({ RECOMMENDER_URL: 'http://market-aura-ml:8080/recommend' });
  assert.equal(renderConfig.recommend, 'http://market-aura-ml:8080/recommend');
  assert.equal(renderConfig.authMode, 'none');

  // Arbitrary remote host without auth throws
  assert.throws(
    () => readRecommenderConfig({
      NODE_ENV: 'production',
      RECOMMENDER_URL: 'https://external-ml-service.com/recommend',
      RECOMMENDER_AUTH_MODE: 'none',
    }),
    /Unauthenticated recommender access is allowed only for local loopback development/
  );
});

test('Hardening: uploads directory is outside src with backward-compatible fallback', async () => {
  // PRIMARY_UPLOADS_ROOT is outside src
  assert.ok(!PRIMARY_UPLOADS_ROOT.includes(path.sep + 'src' + path.sep));
  assert.ok(PRIMARY_UPLOADS_ROOT.endsWith(path.join('uploads', 'media')));
  assert.equal(UPLOADS_ROOT, PRIMARY_UPLOADS_ROOT);

  // LEGACY_UPLOADS_ROOT is inside src
  assert.ok(LEGACY_UPLOADS_ROOT.includes(path.sep + 'src' + path.sep));

  const provider = new LocalStorageProvider();
  assert.equal(provider.uploadsRoot, PRIMARY_UPLOADS_ROOT);

  // Verify backward compatible file serving
  const testUserId = '507f1f77bcf86cd799439099';
  const testFilename = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg';
  const legacyDir = path.join(LEGACY_UPLOADS_ROOT, testUserId);
  const legacyFile = path.join(legacyDir, testFilename);

  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(legacyFile, Buffer.from('legacy-data-file'));

  let sentFile = null;
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    sendFile(filePath) { sentFile = filePath; return this; },
  };

  serveUploadedMedia({ params: { userId: testUserId, filename: testFilename } }, mockRes);
  assert.equal(sentFile, legacyFile);

  // Clean up legacy test file
  fs.rmSync(legacyDir, { recursive: true, force: true });
});

test('Hardening: getDbConnectionOptions configures pool size and timeout appropriately', () => {
  // Default on normal runtime
  const defaultOpts = getDbConnectionOptions({});
  assert.equal(defaultOpts.maxPoolSize, 20);
  assert.equal(defaultOpts.serverSelectionTimeoutMS, 5000);

  // Vercel serverless default
  const vercelOpts = getDbConnectionOptions({ VERCEL: '1' });
  assert.equal(vercelOpts.maxPoolSize, 10);

  // Explicit override
  const customOpts = getDbConnectionOptions({ MONGO_MAX_POOL_SIZE: '15' });
  assert.equal(customOpts.maxPoolSize, 15);
});
