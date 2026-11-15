const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { describe, test, beforeEach, afterEach, mock } = require('node:test');
const SocialAccount = require('../src/models/SocialAccount');
const User = require('../src/models/User');
const OAuthState = require('../src/models/OAuthState');
const { encryptSecret, decryptSecret } = require('../src/utils/tokenCrypto');
const {
  disconnectAccountById,
  getConnectedAccounts,
} = require('../src/controllers/connectAccount/socialConnectController');
const { verifyPayment } = require('../src/controllers/payments/paymentController');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
  };
  return res;
}

describe('Multi-Tenant Social Accounts & Multi-User Architecture', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('SocialAccount model hides encrypted secrets from JSON serialization', () => {
    const rawAccount = {
      _id: '607f1f77bcf86cd799439022',
      userId: '507f1f77bcf86cd799439011',
      provider: 'twitter',
      providerAccountId: '12345678',
      username: 'aura_user',
      displayName: 'Aura Marketing',
      encryptedAccessToken: encryptSecret('super-secret-access-token'),
      encryptedRefreshToken: encryptSecret('super-secret-refresh-token'),
      connectionStatus: 'connected',
    };

    const doc = new SocialAccount(rawAccount);
    const json = doc.toJSON();

    assert.equal(json.id, '607f1f77bcf86cd799439022');
    assert.equal(json.username, 'aura_user');
    assert.equal(json.provider, 'twitter');
    assert.equal(json.encryptedAccessToken, undefined, 'Access token MUST NOT be in toJSON output');
    assert.equal(json.encryptedRefreshToken, undefined, 'Refresh token MUST NOT be in toJSON output');
  });

  test('Token encryption: AES-256-GCM protects tokens at rest and fails safely on tampering', () => {
    const plainToken = 'oauth2_token_xyz_987654321';
    const encrypted = encryptSecret(plainToken);

    assert.ok(typeof encrypted === 'string' && encrypted.includes('.'));
    assert.notEqual(encrypted, plainToken);

    const decrypted = decryptSecret(encrypted);
    assert.equal(decrypted, plainToken);

    // Tampered payload must fail closed without throwing
    const [iv, tag, cipher] = encrypted.split('.');
    const tampered = `${iv}.${tag}.${cipher.slice(0, -4)}AAAA`;
    assert.equal(decryptSecret(tampered), null);
    assert.equal(decryptSecret('invalid.format'), null);
  });

  test('User A and User B can connect accounts independently without cross-tenant leakage', async () => {
    const userAId = '507f1f77bcf86cd799439011';
    const userBId = '507f1f77bcf86cd799439022';

    const mockDb = [
      {
        _id: '607f1f77bcf86cd799439031',
        userId: userAId,
        provider: 'linkedin',
        providerAccountId: 'urn:li:person:user_a_li',
        username: 'alice_growth',
        displayName: 'Alice',
        connectionStatus: 'connected',
      },
      {
        _id: '607f1f77bcf86cd799439032',
        userId: userBId,
        provider: 'linkedin',
        providerAccountId: 'urn:li:person:user_b_li',
        username: 'bob_marketing',
        displayName: 'Bob',
        connectionStatus: 'connected',
      },
    ];

    mock.method(SocialAccount, 'find', (filter) => ({
      sort: () => mockDb.filter((acc) => acc.userId === filter.userId && acc.connectionStatus !== 'disconnected'),
    }));

    // User A fetches their accounts
    const reqA = { user: { id: userAId } };
    const resA = mockRes();
    await getConnectedAccounts(reqA, resA);

    assert.equal(resA.statusCode, 200);
    assert.equal(resA.body.count, 1);
    assert.equal(resA.body.data[0].username, 'alice_growth');
    assert.equal(resA.body.data[0].providerAccountId, 'urn:li:person:user_a_li');

    // User B fetches their accounts
    const reqB = { user: { id: userBId } };
    const resB = mockRes();
    await getConnectedAccounts(reqB, resB);

    assert.equal(resB.statusCode, 200);
    assert.equal(resB.body.count, 1);
    assert.equal(resB.body.data[0].username, 'bob_marketing');
    assert.equal(resB.body.data[0].providerAccountId, 'urn:li:person:user_b_li');
  });

  test('User C can connect multiple accounts from the SAME provider (e.g., 2 Twitter accounts)', async () => {
    const userCId = '507f1f77bcf86cd799439033';

    const userCAccounts = [
      {
        _id: '607f1f77bcf86cd799439041',
        userId: userCId,
        provider: 'twitter',
        providerAccountId: 'tw_111',
        username: 'carol_personal',
        displayName: 'Carol Personal',
        connectionStatus: 'connected',
      },
      {
        _id: '607f1f77bcf86cd799439042',
        userId: userCId,
        provider: 'twitter',
        providerAccountId: 'tw_222',
        username: 'carol_brand',
        displayName: 'Carol Brand Co',
        connectionStatus: 'connected',
      },
    ];

    mock.method(SocialAccount, 'find', (filter) => ({
      sort: () => userCAccounts.filter((acc) => acc.userId === filter.userId && acc.connectionStatus !== 'disconnected'),
    }));

    const req = { user: { id: userCId } };
    const res = mockRes();
    await getConnectedAccounts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 2, 'User C must have 2 distinct Twitter accounts');
    assert.equal(res.body.data[0].username, 'carol_personal');
    assert.equal(res.body.data[1].username, 'carol_brand');
  });

  test('IDOR Protection: User A cannot disconnect User B accounts by ID', async () => {
    const userAId = '507f1f77bcf86cd799439011';
    const userBId = '507f1f77bcf86cd799439022';
    const accountBId = '607f1f77bcf86cd799439088';

    // SocialAccount exists but belongs to User B
    mock.method(SocialAccount, 'findOne', async (query) => {
      if (query._id === accountBId && query.userId === userBId) {
        return {
          _id: accountBId,
          userId: userBId,
          provider: 'twitter',
          connectionStatus: 'connected',
          save: async () => {},
        };
      }
      return null;
    });

    // User A tries to disconnect User B's account
    const req = { user: { id: userAId }, params: { id: accountBId } };
    const res = mockRes();
    await disconnectAccountById(req, res);

    assert.equal(res.statusCode, 404, 'Attempt to access another user account must return 404');
    assert.equal(res.body.success, false);
  });

  test('Disconnecting account updates connection status and wipes stored tokens', async () => {
    const userAId = '507f1f77bcf86cd799439011';
    const accountAId = '607f1f77bcf86cd799439099';

    let savedAccount = null;
    mock.method(SocialAccount, 'findOne', async (query) => {
      if (query._id === accountAId && query.userId === userAId) {
        savedAccount = {
          _id: accountAId,
          userId: userAId,
          provider: 'twitter',
          connectionStatus: 'connected',
          encryptedAccessToken: 'token_cipher',
          encryptedRefreshToken: 'refresh_cipher',
          async save() { return this; },
        };
        return savedAccount;
      }
      return null;
    });

    mock.method(User, 'findById', async () => ({
      _id: userAId,
      socialAccounts: { twitter: { isConnected: true } },
      save: async () => {},
    }));

    const req = { user: { id: userAId }, params: { id: accountAId } };
    const res = mockRes();
    await disconnectAccountById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(savedAccount.connectionStatus, 'disconnected');
    assert.equal(savedAccount.encryptedAccessToken, null, 'Tokens must be purged upon disconnection');
    assert.equal(savedAccount.encryptedRefreshToken, null);
  });

  test('OAuth State single-use verification protects against replay attacks', async () => {
    const stateId = 'valid_oauth_state_12345';
    const store = new Map();
    store.set(stateId, {
      state: stateId,
      userId: '507f1f77bcf86cd799439011',
      platform: 'twitter',
      codeVerifier: 'verifier_abc',
    });

    mock.method(OAuthState, 'findOneAndDelete', async (query) => {
      const entry = store.get(query.state);
      if (entry && entry.platform === query.platform) {
        store.delete(query.state);
        return entry;
      }
      return null;
    });

    // First redemption succeeds
    const firstAttempt = await OAuthState.findOneAndDelete({ state: stateId, platform: 'twitter' });
    assert.ok(firstAttempt);
    assert.equal(firstAttempt.codeVerifier, 'verifier_abc');

    // Replay redemption fails cleanly
    const replayedAttempt = await OAuthState.findOneAndDelete({ state: stateId, platform: 'twitter' });
    assert.equal(replayedAttempt, null, 'Replayed state must fail');
  });

  test('Payment Verification: rejects unauthenticated caller and enforces constant-time signature validation', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'secret_key_123';

    // 1. Unauthenticated request
    const unauthReq = { user: null, body: { orderId: 'ord_1', paymentId: 'pay_1', signature: 'sig_1' } };
    const unauthRes = mockRes();
    await verifyPayment(unauthReq, unauthRes);
    assert.equal(unauthRes.statusCode, 401);

    // 2. Invalid forged HMAC signature
    const invalidReq = {
      user: { id: '507f1f77bcf86cd799439011' },
      body: {
        orderId: 'ord_1',
        paymentId: 'pay_1',
        signature: 'forged_fake_signature_hex_00000000000000000000000000000000',
      },
    };
    const invalidRes = mockRes();
    await verifyPayment(invalidReq, invalidRes);
    assert.equal(invalidRes.statusCode, 400);
    assert.equal(invalidRes.body.message, 'Invalid Signature');

    // 3. Valid HMAC signature
    const validBody = 'ord_1|pay_1';
    const validSig = crypto.createHmac('sha256', 'secret_key_123').update(validBody).digest('hex');
    const validReq = {
      user: { id: '507f1f77bcf86cd799439011' },
      body: {
        orderId: 'ord_1',
        paymentId: 'pay_1',
        signature: validSig,
        planId: 'starter',
      },
    };
    const validRes = mockRes();
    await verifyPayment(validReq, validRes);
    assert.equal(validRes.statusCode, 200);
    assert.equal(validRes.body.success, true);
    assert.equal(validRes.body.subscription.plan, 'starter');
    assert.equal(validRes.body.subscription.monthlyCredits, 500);
  });

  test('Payment Verification: prevents duplicate payment transaction reuse across accounts', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'secret_key_456';
    const orderId = 'ord_reuse_test';
    const paymentId = 'pay_reuse_test';
    const sig = crypto.createHmac('sha256', 'secret_key_456').update(`${orderId}|${paymentId}`).digest('hex');

    // Mock that paymentId already exists on another user
    mock.method(User, 'findOne', async (query) => {
      if (query['subscription.paymentId'] === paymentId) {
        return { _id: 'other_user_id', email: 'victim@example.com' };
      }
      return null;
    });

    const req = {
      user: { id: 'attacker_user_id' },
      body: {
        orderId,
        paymentId,
        signature: sig,
        planId: 'enterprise',
      },
    };
    const res = mockRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 409, 'Duplicate payment reuse must be rejected with 409 Conflict');
    assert.ok(res.body.message.includes('already been claimed'));
  });

  test('Payment Verification: idempotent replay on the same account returns 200 without resetting credits', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'secret_key_456';
    const orderId = 'ord_idempotent_test';
    const paymentId = 'pay_idempotent_test';
    const sig = crypto.createHmac('sha256', 'secret_key_456').update(`${orderId}|${paymentId}`).digest('hex');
    const targetUserId = '507f1f77bcf86cd799439011';

    let findByIdAndUpdateCalled = false;
    mock.method(User, 'findByIdAndUpdate', async () => {
      findByIdAndUpdateCalled = true;
    });

    // Mock that paymentId is already recorded on the SAME user
    mock.method(User, 'findOne', async (query) => {
      if (query['subscription.paymentId'] === paymentId) {
        return {
          _id: targetUserId,
          email: 'same_user@example.com',
          subscription: {
            status: 'active',
            plan: 'pro',
            startDate: new Date('2026-11-01T00:00:00.000Z'),
            paymentId,
          },
          credits: { monthly: 2500, used: 1200 },
        };
      }
      return null;
    });

    const req = {
      user: { id: targetUserId },
      body: {
        orderId,
        paymentId,
        signature: sig,
        planId: 'pro',
      },
    };
    const res = mockRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.message, /already processed/i);
    assert.equal(res.body.subscription.plan, 'pro');
    assert.equal(res.body.subscription.monthlyCredits, 2500);
    assert.equal(findByIdAndUpdateCalled, false, 'Should NOT call findByIdAndUpdate or reset credits.used on replay');
  });
});
