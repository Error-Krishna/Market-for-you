const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { beforeEach, afterEach, test, mock } = require('node:test');

const MediaAsset = require('../src/models/MediaAsset');
const ScheduledPost = require('../src/models/ScheduledPost');
const { getStorageConfig, validateR2Config, sanitizeR2Endpoint } = require('../src/services/storage/storageConfig');
const R2StorageProvider = require('../src/services/storage/r2StorageProvider');
const LocalStorageProvider = require('../src/services/storage/localStorageProvider');
const { getStorageProvider, setCustomStorageProvider, resetStorageProviderCache } = require('../src/services/storage/storageProvider');
const { createMedia, updateMedia, deleteMedia, UPLOADS_ROOT } = require('../src/controllers/media/mediaController');
const { publish: publishInstagram } = require('../src/services/publishers/instagramPublisher');
const { runMigration } = require('../scripts/migrateMediaToR2');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const userId = '507f1f77bcf86cd799439011';
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const VALID_JPEG_BASE64 = VALID_JPEG_BUFFER.toString('base64');

beforeEach(() => {
  mock.restoreAll();
  resetStorageProviderCache();
});

afterEach(() => {
  mock.restoreAll();
  resetStorageProviderCache();
  delete process.env.MEDIA_STORAGE_PROVIDER;
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_BUCKET_NAME;
  delete process.env.R2_ENDPOINT;
  delete process.env.R2_PUBLIC_BASE_URL;
  delete process.env.R2_PUBLIC_URL;
  delete process.env.MEDIA_STORAGE_PREFIX;
  delete process.env.MEDIA_UPLOADS_ENABLED;
  delete process.env.MEDIA_MAX_UPLOAD_BYTES;
  delete process.env.MEDIA_USER_STORAGE_QUOTA_BYTES;
  delete process.env.MEDIA_USER_MONTHLY_UPLOAD_LIMIT;
});

test('R2 Config: validateR2Config throws descriptive error when required variables are missing', () => {
  assert.throws(
    () => validateR2Config({ r2: {} }),
    /missing required environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL/
  );

  // Rejects non-HTTPS public base URL
  assert.throws(
    () => validateR2Config({
      r2: {
        accountId: 'acc123',
        accessKeyId: 'key123',
        secretAccessKey: 'sec123',
        bucketName: 'market-aura-media',
        publicBaseUrl: 'http://insecure.example.com',
      },
    }),
    /must be an HTTPS URL/
  );

  assert.doesNotThrow(() => {
    validateR2Config({
      r2: {
        accountId: 'acc123',
        accessKeyId: 'key123',
        secretAccessKey: 'sec123',
        bucketName: 'market-aura-media',
        publicBaseUrl: 'https://media.marketaura4u.com',
      },
    });
  });
});

test('R2 Config: getStorageConfig selects local by default and switches to r2 when credentials present', () => {
  delete process.env.MEDIA_STORAGE_PROVIDER;
  assert.equal(getStorageConfig().provider, 'local');

  process.env.R2_ACCOUNT_ID = 'acc123';
  process.env.R2_ACCESS_KEY_ID = 'key123';
  process.env.R2_SECRET_ACCESS_KEY = 'sec123';
  process.env.R2_BUCKET_NAME = 'media-bucket';
  process.env.R2_PUBLIC_BASE_URL = 'https://media.marketaura4u.com';

  const r2Config = getStorageConfig();
  assert.equal(r2Config.provider, 'r2');
  assert.equal(r2Config.r2.endpoint, 'https://acc123.r2.cloudflarestorage.com');
  assert.equal(r2Config.r2.prefix, 'media');
});

test('R2 Config: canonicalizes R2_PUBLIC_BASE_URL and falls back to R2_PUBLIC_URL', () => {
  process.env.R2_ACCOUNT_ID = 'acc123';
  process.env.R2_ACCESS_KEY_ID = 'key123';
  process.env.R2_SECRET_ACCESS_KEY = 'sec123';
  process.env.R2_BUCKET_NAME = 'media-bucket';
  process.env.R2_PUBLIC_URL = 'https://fallback-cdn.example.com';

  const cfg = getStorageConfig();
  assert.equal(cfg.r2.publicBaseUrl, 'https://fallback-cdn.example.com');
});

test('R2 Endpoint: sanitizeR2Endpoint strips trailing bucket name and slashes', () => {
  const accountId = 'fdf81651f10340c25dc8cacf075b1482';
  const rawWithBucket = `https://${accountId}.r2.cloudflarestorage.com/market-aura-media`;
  const sanitized = sanitizeR2Endpoint(rawWithBucket, accountId);
  assert.equal(sanitized, `https://${accountId}.r2.cloudflarestorage.com`);

  const rawWithSlash = `https://${accountId}.r2.cloudflarestorage.com/`;
  assert.equal(sanitizeR2Endpoint(rawWithSlash, accountId), `https://${accountId}.r2.cloudflarestorage.com`);

  assert.equal(sanitizeR2Endpoint('', accountId), `https://${accountId}.r2.cloudflarestorage.com`);
});

test('StorageProvider Factory: returns LocalStorageProvider when provider is local', () => {
  const provider = getStorageProvider('local');
  assert.ok(provider instanceof LocalStorageProvider);
  assert.equal(provider.name, 'local');
});

test('R2StorageProvider: generates storage key matching {prefix}/users/{userId}/media/{uuid}.{ext}', () => {
  const provider = new R2StorageProvider({
    bucketName: 'my-bucket',
    publicBaseUrl: 'https://media.marketaura4u.com',
    prefix: 'cdn-assets',
    s3Client: { send: async () => ({}) },
  });

  const key = provider.buildStorageKey({ userId: 'user999', ext: '.PNG' });
  assert.match(key, /^cdn-assets\/users\/user999\/media\/[a-f0-9-]+\.png$/);

  const url = provider.getPublicUrl(key);
  assert.equal(url, `https://media.marketaura4u.com/${key}`);
});

test('R2StorageProvider: upload, delete and head send correct S3 commands and metadata', async () => {
  const sentCommands = [];
  const mockS3Client = {
    send: async (command) => {
      sentCommands.push(command);
      return { $metadata: { httpStatusCode: 200 } };
    },
  };

  const provider = new R2StorageProvider({
    bucketName: 'market-aura-bucket',
    publicBaseUrl: 'https://media.marketaura4u.com',
    prefix: 'media',
    s3Client: mockS3Client,
  });

  const key = 'media/users/user1/media/test.jpg';
  const uploadResult = await provider.upload({
    buffer: VALID_JPEG_BUFFER,
    key,
    contentType: 'image/jpeg',
    metadata: { userId: 'user1', originalName: 'banner.jpg' },
  });

  assert.equal(uploadResult.key, key);
  assert.equal(uploadResult.url, `https://media.marketaura4u.com/${key}`);
  assert.equal(uploadResult.provider, 'r2');
  assert.equal(uploadResult.contentType, 'image/jpeg');
  assert.equal(uploadResult.size, VALID_JPEG_BUFFER.length);

  assert.equal(sentCommands.length, 1);
  const putCmd = sentCommands[0];
  assert.equal(putCmd.input.Bucket, 'market-aura-bucket');
  assert.equal(putCmd.input.Key, key);
  assert.equal(putCmd.input.ContentType, 'image/jpeg');
  assert.deepEqual(putCmd.input.Metadata, { userid: 'user1', originalname: 'banner.jpg' });

  await provider.head(key);
  assert.equal(sentCommands.length, 2);
  assert.equal(sentCommands[1].input.Key, key);

  await provider.delete(key);
  assert.equal(sentCommands.length, 3);
  assert.equal(sentCommands[2].input.Key, key);
});

test('mediaController: createMedia uploads to R2 and sets storageProvider and canonical public URL', async () => {
  process.env.MEDIA_STORAGE_PROVIDER = 'r2';
  process.env.R2_ACCOUNT_ID = 'test-account-id';
  process.env.R2_ACCESS_KEY_ID = 'test-access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.R2_BUCKET_NAME = 'market-aura-r2';
  process.env.R2_PUBLIC_BASE_URL = 'https://media.marketaura4u.com';

  const commands = [];
  const mockS3 = {
    send: async (cmd) => {
      commands.push(cmd);
      return {};
    },
  };

  const provider = new R2StorageProvider({
    bucketName: 'market-aura-r2',
    publicBaseUrl: 'https://media.marketaura4u.com',
    prefix: 'media',
    s3Client: mockS3,
  });

  let savedDoc = null;
  mock.method(MediaAsset, 'create', async (doc) => {
    savedDoc = { ...doc, id: '607f1f77bcf86cd799439055' };
    return savedDoc;
  });
  mock.method(MediaAsset, 'findOne', async () => null);

  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: {
      title: 'R2 Product Image',
      altText: 'Organic glow bottle',
      mimeType: 'image/jpeg',
      dataBase64: `data:image/jpeg;base64,${VALID_JPEG_BASE64}`,
    },
  };
  const res = mockRes();

  setCustomStorageProvider(provider);

  await createMedia(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(savedDoc.storageProvider, 'r2');
  assert.match(savedDoc.url, /^https:\/\/media\.marketaura4u\.com\/media\/users\/507f1f77bcf86cd799439011\/media\/[a-f0-9-]+\.jpg$/);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].input.Bucket, 'market-aura-r2');
});

test('mediaController: createMedia rejects when uploads are administratively disabled', async () => {
  process.env.MEDIA_UPLOADS_ENABLED = 'false';

  const req = {
    user: { id: userId },
    body: {
      title: 'Disabled Upload Image',
      dataBase64: `data:image/jpeg;base64,${VALID_JPEG_BASE64}`,
    },
  };
  const res = mockRes();
  await createMedia(req, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'UPLOADS_DISABLED');
});

test('mediaController: createMedia cleans up uploaded R2 object if DB persistence fails', async () => {
  const deletedKeys = [];
  const mockProvider = {
    name: 'r2',
    buildStorageKey: () => 'media/users/user1/media/fail-test.jpg',
    upload: async () => ({
      key: 'media/users/user1/media/fail-test.jpg',
      url: 'https://media.marketaura4u.com/media/users/user1/media/fail-test.jpg',
      provider: 'r2',
    }),
    delete: async (k) => { deletedKeys.push(k); },
  };
  setCustomStorageProvider(mockProvider);

  mock.method(MediaAsset, 'findOne', async () => null);
  mock.method(MediaAsset, 'create', async () => {
    throw new Error('Mongo write error: disk full');
  });

  const req = {
    user: { id: userId },
    body: {
      title: 'Crash Upload',
      dataBase64: `data:image/jpeg;base64,${VALID_JPEG_BASE64}`,
    },
  };
  const res = mockRes();
  await createMedia(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(deletedKeys.length, 1);
  assert.equal(deletedKeys[0], 'media/users/user1/media/fail-test.jpg');
});

test('mediaController: updateMedia replaces media file in R2 and cleans up old storage key', async () => {
  const assetId = '607f1f77bcf86cd799439066';
  const oldStorageKey = 'media/users/507f1f77bcf86cd799439011/media/old-uuid.jpg';
  const newStorageKey = 'media/users/507f1f77bcf86cd799439011/media/new-uuid.jpg';

  const deletedKeys = [];
  const uploadedKeys = [];

  const mockProvider = {
    name: 'r2',
    buildStorageKey: () => newStorageKey,
    upload: async (params) => {
      uploadedKeys.push(params.key);
      return {
        key: params.key,
        url: `https://media.marketaura4u.com/${params.key}`,
        provider: 'r2',
      };
    },
    delete: async (key) => {
      deletedKeys.push(key);
    },
  };
  setCustomStorageProvider(mockProvider);

  const existingAsset = {
    _id: assetId,
    userId,
    title: 'Original Title',
    altText: 'Original Alt',
    tags: ['first'],
    sourceType: 'upload',
    storageKey: oldStorageKey,
    storageProvider: 'r2',
    url: `https://media.marketaura4u.com/${oldStorageKey}`,
    mimeType: 'image/jpeg',
    sizeBytes: 1234,
    save: async function () { return this; },
  };

  mock.method(MediaAsset, 'findOne', async () => existingAsset);

  const req = {
    params: { id: assetId },
    user: { id: userId },
    body: {
      title: 'Updated Title',
      altText: 'Updated Alt',
      dataBase64: `data:image/jpeg;base64,${VALID_JPEG_BASE64}`,
    },
  };
  const res = mockRes();

  await updateMedia(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(existingAsset.title, 'Updated Title');
  assert.equal(existingAsset.storageKey, newStorageKey);
  assert.equal(uploadedKeys.length, 1);
  assert.equal(uploadedKeys[0], newStorageKey);
  assert.equal(deletedKeys.length, 1);
  assert.equal(deletedKeys[0], oldStorageKey);
});

test('mediaController: deleteMedia deletes object in R2 and rejects deletion if asset is locked in active scheduled post', async () => {
  const assetId = '607f1f77bcf86cd799439066';
  const assetDoc = {
    _id: assetId,
    userId,
    title: 'Active Banner',
    storageKey: 'media/users/507f1f77bcf86cd799439011/media/uuid-123.jpg',
    storageProvider: 'r2',
    url: 'https://media.marketaura4u.com/media/users/507f1f77bcf86cd799439011/media/uuid-123.jpg',
  };

  const deletedKeys = [];
  const mockR2 = {
    name: 'r2',
    delete: async (key) => { deletedKeys.push(key); },
  };
  setCustomStorageProvider(mockR2);

  // 1. When an active scheduled post references the asset, deleteMedia returns 409 Conflict
  mock.method(ScheduledPost, 'findOne', async () => ({
    _id: '607f1f77bcf86cd799439088',
    status: 'scheduled',
  }));

  const conflictRes = mockRes();
  await deleteMedia({ user: { id: userId }, params: { id: assetId } }, conflictRes);
  assert.equal(conflictRes.statusCode, 409);
  assert.match(conflictRes.body.message, /referenced by an active scheduled post/i);
  assert.equal(deletedKeys.length, 0);

  // 2. When no active post references it, deleteMedia succeeds and cleans up R2 object
  mock.method(ScheduledPost, 'findOne', async () => null);
  mock.method(MediaAsset, 'findOneAndDelete', async () => assetDoc);

  const okRes = mockRes();
  await deleteMedia({ user: { id: userId }, params: { id: assetId } }, okRes);
  assert.equal(okRes.statusCode, 200);
  assert.equal(deletedKeys.length, 1);
  assert.equal(deletedKeys[0], assetDoc.storageKey);
});

test('Instagram Publisher: accepts canonical public HTTPS R2 URLs and passes them to Meta Graph API', async () => {
  const r2ImageUrl = 'https://media.marketaura4u.com/media/users/user1/media/test-image-123.jpg';
  const fetchCalls = [];

  mock.method(globalThis, 'fetch', async (url, options) => {
    const urlStr = String(url);
    const bodyStr = options?.body ? JSON.parse(options.body) : null;
    fetchCalls.push({ url: urlStr, body: bodyStr });

    if (urlStr.includes('fields=status_code')) {
      return new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 });
    }
    if (urlStr.includes('/media_publish')) {
      return new Response(JSON.stringify({ id: 'meta_published_post_999' }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 'meta_container_12345' }), { status: 200 });
  });

  const user = {
    socialAccounts: {
      instagram: {
        isConnected: true,
        instagramId: 'ig_user_1234',
        accessToken: 'EAAB_test_token',
      },
    },
  };

  const result = await publishInstagram({
    user,
    content: { caption: 'Check out our new skincare launch!' },
    mediaUrls: [r2ImageUrl],
  });

  assert.equal(result.externalPostId, 'meta_published_post_999');
  assert.ok(fetchCalls.length >= 2);
  assert.equal(fetchCalls[0].body.image_url, r2ImageUrl);
});

test('End-to-End: Local file upload via createMedia to R2 produces valid asset and publishes to Instagram as image or reel', async () => {
  const uploadedFiles = [];
  const mockR2 = {
    name: 'r2',
    buildStorageKey: ({ userId: uid, ext }) => `media/users/${uid}/media/e2e-asset-123.${ext}`,
    getPublicUrl: (k) => `https://pub-7cf3871d4a324799b6e5079c0053e950.r2.dev/${k}`,
    upload: async (params) => {
      uploadedFiles.push(params);
      return {
        key: params.key,
        url: `https://pub-7cf3871d4a324799b6e5079c0053e950.r2.dev/${params.key}`,
        provider: 'r2',
      };
    },
  };
  setCustomStorageProvider(mockR2);

  let savedAsset = null;
  mock.method(MediaAsset, 'create', async (doc) => {
    savedAsset = { ...doc, _id: '607f1f77bcf86cd799439088' };
    return savedAsset;
  });

  // 1. Upload local JPEG
  const uploadRes = mockRes();
  await createMedia({
    user: { id: userId },
    protocol: 'https',
    get: () => 'app.marketaura4u.com',
    body: {
      title: 'Summer Sale Poster',
      dataBase64: `data:image/jpeg;base64,${VALID_JPEG_BASE64}`,
    },
  }, uploadRes);

  assert.equal(uploadRes.statusCode, 201);
  assert.equal(savedAsset.storageProvider, 'r2');
  assert.equal(savedAsset.url, 'https://pub-7cf3871d4a324799b6e5079c0053e950.r2.dev/media/users/507f1f77bcf86cd799439011/media/e2e-asset-123.jpg');

  // 2. Publish to Instagram with the resolved R2 URL
  const fetchCalls = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    const urlStr = String(url);
    const bodyStr = options?.body ? JSON.parse(options.body) : null;
    fetchCalls.push({ url: urlStr, body: bodyStr });

    if (urlStr.includes('fields=status_code')) {
      return new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 });
    }
    if (urlStr.includes('/media_publish')) {
      return new Response(JSON.stringify({ id: 'meta_pub_e2e_456' }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 'meta_cont_e2e_123' }), { status: 200 });
  });

  const igUser = {
    socialAccounts: {
      instagram: {
        isConnected: true,
        instagramId: 'ig_user_456',
        accessToken: 'EAAB_token_e2e',
      },
    },
  };

  const pubResult = await publishInstagram({
    user: igUser,
    content: { caption: 'Exclusive Summer Drop!' },
    mediaUrls: [savedAsset.url],
  });

  assert.equal(pubResult.externalPostId, 'meta_pub_e2e_456');
  assert.equal(fetchCalls[0].body.image_url, savedAsset.url);
  assert.equal(fetchCalls[0].body.caption, 'Exclusive Summer Drop!');

  // 3. Test video upload creates REELS container
  const r2VideoUrl = 'https://pub-7cf3871d4a324799b6e5079c0053e950.r2.dev/media/users/507f1f77bcf86cd799439011/media/clip.mp4';
  const videoFetchCalls = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    const urlStr = String(url);
    const bodyStr = options?.body ? JSON.parse(options.body) : null;
    videoFetchCalls.push({ url: urlStr, body: bodyStr });

    if (urlStr.includes('fields=status_code')) {
      return new Response(JSON.stringify({ status_code: 'FINISHED' }), { status: 200 });
    }
    if (urlStr.includes('/media_publish')) {
      return new Response(JSON.stringify({ id: 'meta_pub_video_789' }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 'meta_cont_video_345' }), { status: 200 });
  });

  const videoResult = await publishInstagram({
    user: igUser,
    content: { caption: 'Watch our product video!' },
    mediaUrls: [r2VideoUrl],
  });

  assert.equal(videoResult.externalPostId, 'meta_pub_video_789');
  assert.equal(videoFetchCalls[0].body.media_type, 'REELS');
  assert.equal(videoFetchCalls[0].body.video_url, r2VideoUrl);
});

test('Instagram Publisher: surfaces full Meta error details (code, subcode, user title, user msg)', async () => {
  const validImgUrl = 'https://media.marketaura4u.com/media/users/u1/media/photo.jpg';

  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    error: {
      message: 'Only photo or video can be accepted as media type.',
      code: 9004,
      type: 'OAuthException',
      error_subcode: 2207052,
      error_user_title: 'Media download has failed.',
      error_user_msg: 'The media could not be fetched from this URI.',
      fbtrace_id: 'TEST_FB_TRACE_999',
    },
  }), { status: 400 }));

  const user = {
    socialAccounts: {
      instagram: { isConnected: true, instagramId: 'ig_123', accessToken: 'EAAB_token' },
    },
  };

  await assert.rejects(
    () => publishInstagram({ user, content: { caption: 'Check this' }, mediaUrls: [validImgUrl] }),
    (err) => {
      assert.equal(err.code, 'PLATFORM_API_ERROR');
      assert.match(err.message, /Media download has failed/);
      assert.match(err.message, /The media could not be fetched from this URI/);
      assert.match(err.message, /Only photo or video can be accepted/);
      assert.match(err.message, /code: 9004, subcode: 2207052/);
      assert.equal(err.metaError.code, 9004);
      assert.equal(err.metaError.subcode, 2207052);
      assert.equal(err.metaError.fbtraceId, 'TEST_FB_TRACE_999');
      return true;
    }
  );
});

test('Migration Script: migrateMediaToR2 runs dry-run and live migration idempotently', async () => {
  const localKey = `${userId}/local-test-asset.jpg`;
  const userDir = path.join(UPLOADS_ROOT, userId);
  fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_ROOT, localKey), VALID_JPEG_BUFFER);

  const candidateDoc = {
    _id: '607f1f77bcf86cd799439077',
    userId,
    title: 'Local Legacy Asset',
    sourceType: 'upload',
    storageKey: localKey,
    storageProvider: 'local',
    url: `http://localhost:8000/uploads/media/${localKey}`,
    mimeType: 'image/jpeg',
    async save() { return this; },
  };

  mock.method(MediaAsset, 'find', async () => [candidateDoc]);

  process.env.R2_ACCOUNT_ID = 'test-account-id';
  process.env.R2_ACCESS_KEY_ID = 'test-access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
  process.env.R2_BUCKET_NAME = 'market-aura-r2';
  process.env.R2_PUBLIC_BASE_URL = 'https://media.marketaura4u.com';

  const uploadedToR2 = [];
  const mockR2Provider = {
    buildStorageKey: () => `media/users/${userId}/media/migrated-123.jpg`,
    getPublicUrl: (k) => `https://media.marketaura4u.com/${k}`,
    upload: async (params) => {
      uploadedToR2.push(params);
      return { key: params.key, url: `https://media.marketaura4u.com/${params.key}` };
    },
  };

  // 1. Dry run
  const drySummary = await runMigration({
    dryRun: true,
    deleteLocal: false,
    skipDbConnect: true,
    r2Provider: mockR2Provider,
  });
  assert.equal(drySummary.isDryRun, true);
  assert.equal(drySummary.migrated, 1);
  assert.equal(uploadedToR2.length, 0); // No uploads during dry-run

  // 2. Live migration
  const liveSummary = await runMigration({
    dryRun: false,
    deleteLocal: false,
    skipDbConnect: true,
    r2Provider: mockR2Provider,
  });
  assert.equal(liveSummary.isDryRun, false);
  assert.equal(liveSummary.migrated, 1);
  assert.equal(uploadedToR2.length, 1);
  assert.equal(candidateDoc.storageProvider, 'r2');
  assert.equal(candidateDoc.storageKey, 'media/users/507f1f77bcf86cd799439011/media/migrated-123.jpg');
  assert.equal(candidateDoc.url, 'https://media.marketaura4u.com/media/users/507f1f77bcf86cd799439011/media/migrated-123.jpg');

  // Clean up disk
  if (fs.existsSync(path.join(UPLOADS_ROOT, localKey))) {
    fs.unlinkSync(path.join(UPLOADS_ROOT, localKey));
  }
});
