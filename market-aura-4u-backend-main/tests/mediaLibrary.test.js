const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { beforeEach, afterEach, test, mock } = require('node:test');
const MediaAsset = require('../src/models/MediaAsset');
const {
  listMedia,
  createMedia,
  updateMedia,
  deleteMedia,
  UPLOADS_ROOT,
} = require('../src/controllers/media/mediaController');

const VALID_PNG_BASE64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]).toString('base64');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

const userId = '507f1f77bcf86cd799439011';

beforeEach(() => {
  mock.restoreAll();
});

afterEach(() => {
  mock.restoreAll();
  const userDir = path.join(UPLOADS_ROOT, userId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
});

test('createMedia rejects private/loopback URLs (SSRF prevention)', async () => {
  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: { title: 'Internal', url: 'http://169.254.169.254/latest/meta-data' },
  };
  const res = mockRes();
  await createMedia(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('createMedia rejects mismatched magic bytes for declared MIME type', async () => {
  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: {
      title: 'Fake PNG',
      mimeType: 'image/png',
      dataBase64: Buffer.from('not-actually-a-png-file').toString('base64'),
    },
  };
  const res = mockRes();
  await createMedia(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /do not match/i);
});

test('createMedia stores valid PNG upload and returns asset URL', async () => {
  let createdDoc = null;
  mock.method(MediaAsset, 'create', async (doc) => {
    createdDoc = { ...doc, id: '607f1f77bcf86cd799439022' };
    return createdDoc;
  });

  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: {
      title: 'Product Banner',
      altText: 'Skincare bottle on marble',
      tags: ['launch', 'skincare', 'launch'],
      dataBase64: `data:image/png;base64,${VALID_PNG_BASE64}`,
    },
  };
  const res = mockRes();
  await createMedia(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(createdDoc.sourceType, 'upload');
  assert.equal(createdDoc.mimeType, 'image/png');
  assert.deepEqual(createdDoc.tags, ['launch', 'skincare']);
  assert.ok(fs.existsSync(path.join(UPLOADS_ROOT, createdDoc.storageKey)));
});

test('updateMedia and deleteMedia enforce user ownership and clean up stored file', async () => {
  const userDir = path.join(UPLOADS_ROOT, userId);
  fs.mkdirSync(userDir, { recursive: true });
  const storageKey = path.join(userId, 'sample-file.png');
  fs.writeFileSync(path.join(UPLOADS_ROOT, storageKey), Buffer.from('pngbytes'));

  const assetDoc = {
    _id: '607f1f77bcf86cd799439023',
    userId,
    title: 'Old Title',
    altText: '',
    tags: [],
    sourceType: 'upload',
    url: `http://localhost:8000/uploads/media/${userId}/sample-file.png`,
    storageKey,
    async save() { return this; },
  };

  mock.method(MediaAsset, 'findOne', async (query) => (query.userId === userId ? assetDoc : null));
  mock.method(MediaAsset, 'findOneAndDelete', async (query) => (query.userId === userId ? assetDoc : null));

  const updateRes = mockRes();
  await updateMedia({
    user: { id: userId },
    params: { id: assetDoc._id },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: { title: 'Updated Title', altText: 'New alt text', tags: ['sale'] },
  }, updateRes);
  assert.equal(updateRes.statusCode, 200);
  assert.equal(assetDoc.title, 'Updated Title');

  const deleteRes = mockRes();
  await deleteMedia({ user: { id: userId }, params: { id: assetDoc._id } }, deleteRes);
  assert.equal(deleteRes.statusCode, 200);
  assert.equal(fs.existsSync(path.join(UPLOADS_ROOT, storageKey)), false);
});

test('listMedia scopes query to authenticated user', async () => {
  let capturedFilter = null;
  mock.method(MediaAsset, 'find', (filter) => {
    capturedFilter = filter;
    return { sort: () => ({ limit: async () => [] }) };
  });

  const res = mockRes();
  await listMedia({ user: { id: userId }, query: { mediaType: 'image', q: 'hero' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter.userId, userId);
  assert.equal(capturedFilter.mediaType, 'image');
  assert.ok(Array.isArray(capturedFilter.$or));
});

test('updateMedia and deleteMedia return 400 on invalid media ObjectId', async () => {
  const updateRes = mockRes();
  await updateMedia({ user: { id: userId }, params: { id: 'not-an-id' }, body: { title: 'Test' } }, updateRes);
  assert.equal(updateRes.statusCode, 400);

  const deleteRes = mockRes();
  await deleteMedia({ user: { id: userId }, params: { id: 'not-an-id' } }, deleteRes);
  assert.equal(deleteRes.statusCode, 400);
});

test('createMedia parses image/jpg alias and normalizes to image/jpeg', async () => {
  let createdDoc = null;
  mock.method(MediaAsset, 'create', async (doc) => {
    createdDoc = { ...doc, id: '607f1f77bcf86cd799439099' };
    return createdDoc;
  });

  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: {
      title: 'JPEG with JPG MIME',
      mimeType: 'image/jpg',
      dataBase64: `data:image/jpg;base64,${jpegBytes.toString('base64')}`,
    },
  };
  const res = mockRes();
  await createMedia(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(createdDoc.mimeType, 'image/jpeg');
  assert.equal(createdDoc.mediaType, 'image');
});

test('createMedia handles data URLs with newlines, spaces, and extra parameters', async () => {
  let createdDoc = null;
  mock.method(MediaAsset, 'create', async (doc) => {
    createdDoc = { ...doc, id: '607f1f77bcf86cd799439098' };
    return createdDoc;
  });

  const base64WithNewlines = `${VALID_PNG_BASE64.slice(0, 10)}\n\r  ${VALID_PNG_BASE64.slice(10)}\n`;
  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: {
      title: 'Formatted Base64 Data URL',
      dataBase64: `data:image/png;name=photo.png;base64,${base64WithNewlines}`,
    },
  };
  const res = mockRes();
  await createMedia(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(createdDoc.mimeType, 'image/png');
});

test('createMedia accepts valid MP4 video upload and sets mediaType to video', async () => {
  let createdDoc = null;
  mock.method(MediaAsset, 'create', async (doc) => {
    createdDoc = { ...doc, id: '607f1f77bcf86cd799439097' };
    return createdDoc;
  });

  const validMp4Buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  ]);
  const req = {
    user: { id: userId },
    protocol: 'http',
    get: () => 'localhost:8000',
    body: {
      title: 'Promo Video Clip',
      mimeType: 'video/mp4',
      dataBase64: `data:video/mp4;base64,${validMp4Buffer.toString('base64')}`,
    },
  };
  const res = mockRes();
  await createMedia(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(createdDoc.mediaType, 'video');
  assert.equal(createdDoc.mimeType, 'video/mp4');
});
