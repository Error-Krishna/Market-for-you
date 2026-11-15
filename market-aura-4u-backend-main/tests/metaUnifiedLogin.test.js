const assert = require('node:assert/strict');
const { describe, test, beforeEach, afterEach, mock } = require('node:test');
const axios = require('axios');
const SocialAccount = require('../src/models/SocialAccount');
const User = require('../src/models/User');
const OAuthState = require('../src/models/OAuthState');
const urls = require('../src/config/urls');
const {
  initInstagramConnect,
  instagramCallback,
  disconnectAccountById,
} = require('../src/controllers/connectAccount/socialConnectController');
const { publish } = require('../src/services/publishers/instagramPublisher');
const { encryptSecret, decryptSecret } = require('../src/utils/tokenCrypto');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    redirectUrl: null,
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

describe('Meta Instagram Unified Login Architecture & Publishing Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mock.restoreAll();
    process.env.FACEBOOK_APP_ID = 'meta_app_123456';
    process.env.FACEBOOK_APP_SECRET = 'meta_secret_abcdef';
    process.env.META_UNIFIED_CONFIG_ID = '1128283246795449';
    process.env.PUBLIC_BACKEND_URL = 'http://localhost:8000';
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  afterEach(() => {
    mock.restoreAll();
    process.env = { ...originalEnv };
  });

  test('URLs: Instagram endpoints route through Meta Graph API on graph.facebook.com', () => {
    assert.equal(urls.instagram.oauthAuthorize, 'https://www.facebook.com/v21.0/dialog/oauth');
    assert.equal(urls.instagram.accessToken, 'https://graph.facebook.com/v21.0/oauth/access_token');
    assert.equal(urls.instagram.graphApi, 'https://graph.facebook.com');
  });

  test('Initiation: Generates Unified Login authorization URL with config_id and dynamic callback', async () => {
    let createdState = null;
    mock.method(OAuthState, 'create', async (doc) => {
      createdState = doc;
      return doc;
    });

    const req = {
      user: { id: '507f1f77bcf86cd799439011' },
      protocol: 'http',
      get: () => 'localhost:8000',
    };
    const res = mockRes();

    await initInstagramConnect(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(res.body?.url);
    const authUrl = new URL(res.body.url);

    assert.equal(authUrl.origin, 'https://www.facebook.com');
    assert.equal(authUrl.pathname, '/v21.0/dialog/oauth');
    assert.equal(authUrl.searchParams.get('client_id'), 'meta_app_123456');
    assert.equal(authUrl.searchParams.get('config_id'), '1128283246795449');
    assert.equal(authUrl.searchParams.get('response_type'), 'code');
    assert.equal(
      authUrl.searchParams.get('redirect_uri'),
      'http://localhost:8000/api/v1/auth/social/instagram/callback',
    );
    assert.equal(authUrl.searchParams.get('state'), createdState.state);
    assert.equal(createdState.userId, '507f1f77bcf86cd799439011');
    assert.equal(createdState.platform, 'instagram');
  });

  test('Initiation: Falls back to direct scopes if META_UNIFIED_CONFIG_ID is omitted', async () => {
    delete process.env.META_UNIFIED_CONFIG_ID;
    mock.method(OAuthState, 'create', async (doc) => doc);

    const req = {
      user: { id: '507f1f77bcf86cd799439011' },
      protocol: 'http',
      get: () => 'localhost:8000',
    };
    const res = mockRes();

    await initInstagramConnect(req, res);

    assert.equal(res.statusCode, 200);
    const authUrl = new URL(res.body.url);
    assert.equal(authUrl.searchParams.get('config_id'), null);
    assert.equal(authUrl.searchParams.get('scope'), 'instagram_basic,instagram_content_publish,instagram_manage_messages');
  });

  test('Initiation: Rejects missing META_UNIFIED_CONFIG_ID with CONFIGURATION_ERROR in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.META_UNIFIED_CONFIG_ID;

    const req = { user: { id: '507f1f77bcf86cd799439011' } };
    const res = mockRes();

    await initInstagramConnect(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body?.code, 'CONFIGURATION_ERROR');
    assert.ok(res.body?.message?.includes('META_UNIFIED_CONFIG_ID'));
  });

  test('Initiation: Fails gracefully if Meta credentials are not configured', async () => {
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
    delete process.env.INSTAGRAM_APP_ID;
    delete process.env.INSTAGRAM_APP_SECRET;

    const req = { user: { id: '507f1f77bcf86cd799439011' } };
    const res = mockRes();

    await initInstagramConnect(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body?.code, 'PLATFORM_NOT_CONFIGURED');
  });

  test('Callback: Rejects invalid or expired OAuth state (replay prevention)', async () => {
    mock.method(OAuthState, 'findOneAndDelete', async () => null);

    const req = {
      query: { state: 'tampered_or_expired_state', code: 'valid_code' },
    };
    const res = mockRes();

    await instagramCallback(req, res);

    assert.ok(res.redirectUrl.includes('error=invalid_or_expired_state'));
    assert.ok(res.redirectUrl.includes('platform=instagram'));
  });

  test('Callback: Handles provider error redirect with descriptive error message', async () => {
    const req = {
      query: {
        error: 'access_denied',
        error_description: 'Permissions not granted by user',
      },
    };
    const res = mockRes();

    await instagramCallback(req, res);

    assert.ok(res.redirectUrl.includes('error=Permissions%20not%20granted%20by%20user'));
    assert.ok(res.redirectUrl.includes('platform=instagram'));
  });

  test('Callback & Asset Discovery: SUAT exchange via /me/assigned_instagram_accounts', async () => {
    const stateRecord = {
      state: 'valid_state_123',
      userId: '507f1f77bcf86cd799439011',
      platform: 'instagram',
    };
    mock.method(OAuthState, 'findOneAndDelete', async () => stateRecord);

    mock.method(axios, 'get', async (url) => {
      if (url === urls.instagram.accessToken) {
        return {
          data: {
            access_token: 'EAAMockSUATToken123456',
            token_type: 'bearer',
            expires_in: 5184000,
          },
        };
      }
      if (url.includes('/me/assigned_instagram_accounts')) {
        return {
          data: {
            data: [
              {
                id: '17841400012345678',
                username: 'market_aura_brand',
                name: 'Market Aura Brand',
                profile_picture_url: 'https://cdn.instagram.com/p/pic.jpg',
              },
            ],
          },
        };
      }
      throw new Error(`Unexpected GET request to ${url}`);
    });

    let savedSocialAccount = null;
    mock.method(SocialAccount, 'findOneAndUpdate', async (filter, update) => {
      savedSocialAccount = { filter, update };
      return { _id: '607f1f77bcf86cd799439099' };
    });

    mock.method(User, 'findByIdAndUpdate', async () => ({}));

    const req = {
      query: { state: 'valid_state_123', code: 'valid_auth_code' },
      protocol: 'http',
      get: () => 'localhost:8000',
    };
    const res = mockRes();

    await instagramCallback(req, res);

    assert.equal(res.redirectUrl, 'http://localhost:5173/social-accounts?connected=instagram');
    assert.ok(savedSocialAccount);
    assert.equal(savedSocialAccount.filter.userId, '507f1f77bcf86cd799439011');
    assert.equal(savedSocialAccount.filter.provider, 'instagram');
    assert.equal(savedSocialAccount.filter.providerAccountId, '17841400012345678');

    const updateSet = savedSocialAccount.update.$set;
    assert.equal(updateSet.username, 'market_aura_brand');
    assert.equal(updateSet.displayName, 'Market Aura Brand');
    assert.equal(updateSet.profileImage, 'https://cdn.instagram.com/p/pic.jpg');
    assert.equal(updateSet.connectionStatus, 'connected');
    assert.deepEqual(updateSet.grantedScopes, ['instagram_basic', 'instagram_content_publish', 'instagram_manage_messages']);

    // Verify token encryption
    const decrypted = decryptSecret(updateSet.encryptedAccessToken);
    assert.equal(decrypted, 'EAAMockSUATToken123456');
  });

  test('Callback & Asset Discovery: Falls back to /me/accounts when /me/assigned_instagram_accounts is empty', async () => {
    const stateRecord = {
      state: 'valid_state_456',
      userId: '507f1f77bcf86cd799439022',
      platform: 'instagram',
    };
    mock.method(OAuthState, 'findOneAndDelete', async () => stateRecord);

    mock.method(axios, 'get', async (url) => {
      if (url === urls.instagram.accessToken) {
        return {
          data: {
            access_token: 'EAAMockPageLinkedUserToken789',
            token_type: 'bearer',
            expires_in: 5184000,
          },
        };
      }
      if (url.includes('/me/assigned_instagram_accounts')) {
        return { data: { data: [] } }; // Empty assigned accounts
      }
      if (url.includes('/me/accounts')) {
        return {
          data: {
            data: [
              {
                id: 'page_987654',
                name: 'Main Brand Page',
                instagram_business_account: {
                  id: '178414999998888',
                  username: 'main_brand_ig',
                  name: 'Main Brand Official',
                  profile_picture_url: 'https://cdn.instagram.com/p/main.jpg',
                },
              },
            ],
          },
        };
      }
      throw new Error(`Unexpected GET request to ${url}`);
    });

    let savedSocialAccount = null;
    mock.method(SocialAccount, 'findOneAndUpdate', async (filter, update) => {
      savedSocialAccount = { filter, update };
      return { _id: '607f1f77bcf86cd799439088' };
    });
    mock.method(User, 'findByIdAndUpdate', async () => ({}));

    const req = {
      query: { state: 'valid_state_456', code: 'valid_auth_code_fallback' },
      protocol: 'http',
      get: () => 'localhost:8000',
    };
    const res = mockRes();

    await instagramCallback(req, res);

    assert.equal(res.redirectUrl, 'http://localhost:5173/social-accounts?connected=instagram');
    assert.ok(savedSocialAccount);
    assert.equal(savedSocialAccount.filter.providerAccountId, '178414999998888');
    assert.equal(savedSocialAccount.update.$set.username, 'main_brand_ig');
  });

  test('Callback: Redirects with error when user selects zero Instagram accounts in dialog', async () => {
    const stateRecord = {
      state: 'valid_state_no_account',
      userId: '507f1f77bcf86cd799439033',
      platform: 'instagram',
    };
    mock.method(OAuthState, 'findOneAndDelete', async () => stateRecord);

    mock.method(axios, 'get', async (url) => {
      if (url === urls.instagram.accessToken) {
        return { data: { access_token: 'EAATokenEmpty', token_type: 'bearer' } };
      }
      if (url.includes('/me/assigned_instagram_accounts')) {
        return { data: { data: [] } };
      }
      if (url.includes('/me/accounts')) {
        return { data: { data: [] } };
      }
      if (url.includes('/me')) {
        return { data: { id: 'system_user_no_ig' } };
      }
      return { data: {} };
    });

    const req = {
      query: { state: 'valid_state_no_account', code: 'valid_auth_code' },
      protocol: 'http',
      get: () => 'localhost:8000',
    };
    const res = mockRes();

    await instagramCallback(req, res);

    assert.ok(res.redirectUrl.includes('error=no_instagram_account_found'));
    assert.ok(res.redirectUrl.includes('platform=instagram'));
  });

  test('Multi-Tenancy & IDOR: User A and User B cannot disconnect each others Instagram accounts', async () => {
    const userA_Id = '507f1f77bcf86cd799439011';
    const userB_Id = '507f1f77bcf86cd799439022';
    const accountB_Id = '607f1f77bcf86cd799439099';

    // Mock query that checks both _id and userId
    mock.method(SocialAccount, 'findOne', (filter) => {
      // If User A attempts to find User B's account, filter fails
      if (filter._id === accountB_Id && filter.userId === userA_Id) {
        return null;
      }
      if (filter._id === accountB_Id && filter.userId === userB_Id) {
        return {
          _id: accountB_Id,
          userId: userB_Id,
          provider: 'instagram',
          providerAccountId: '17841400012345678',
          save: async () => {},
        };
      }
      return null;
    });

    mock.method(User, 'findById', async () => ({
      _id: userB_Id,
      socialAccounts: { instagram: { isConnected: true } },
      save: async () => {},
    }));

    // User A tries to disconnect User B's account
    const reqA = { user: { id: userA_Id }, params: { id: accountB_Id } };
    const resA = mockRes();
    await disconnectAccountById(reqA, resA);

    assert.equal(resA.statusCode, 404);
    assert.equal(resA.body?.message, 'Connected account not found.');

    // User B disconnects their own account
    const reqB = { user: { id: userB_Id }, params: { id: accountB_Id } };
    const resB = mockRes();
    await disconnectAccountById(reqB, resB);

    assert.equal(resB.statusCode, 200);
    assert.equal(resB.body?.success, true);
  });

  test('Publishing: Successfully creates media container and publishes via graph.facebook.com', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      socialAccounts: {
        instagram: {
          isConnected: true,
          instagramId: '17841400012345678',
          username: 'market_aura_brand',
          accessTokenEnc: encryptSecret('EAAMockSUATToken123456'),
        },
      },
    };

    const fetchCalls = [];
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options });
      if (url.includes('/media_publish')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'ig_post_published_99999' }),
        };
      }
      if (url.includes('fields=status_code')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status_code: 'FINISHED' }),
        };
      }
      if (url.includes('/media')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'ig_container_11111' }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };

    const result = await publish({
      user,
      content: {
        caption: 'Exciting product launch from Market Aura 4U!',
        image_url: 'https://images.unsplash.com/photo-12345.jpg',
      },
    });

    assert.equal(result.externalPostId, 'ig_post_published_99999');
    assert.equal(result.externalPostUrl, 'https://www.instagram.com/market_aura_brand/');

    // Assert that container creation hit graph.facebook.com
    assert.equal(fetchCalls.length, 3);
    assert.ok(fetchCalls[0].url.startsWith('https://graph.facebook.com/v21.0/17841400012345678/media'));
    const containerBody = JSON.parse(fetchCalls[0].options.body);
    assert.equal(containerBody.image_url, 'https://images.unsplash.com/photo-12345.jpg');
    assert.equal(containerBody.caption, 'Exciting product launch from Market Aura 4U!');
    assert.equal(containerBody.access_token, 'EAAMockSUATToken123456');

    // Assert that status polling hit graph.facebook.com
    assert.ok(fetchCalls[1].url.startsWith('https://graph.facebook.com/v21.0/ig_container_11111'));

    // Assert that media_publish hit graph.facebook.com
    assert.ok(fetchCalls[2].url.startsWith('https://graph.facebook.com/v21.0/17841400012345678/media_publish'));
  });

  test('Publishing: Classifies HTTP 401/403 token revocation as non-retryable TOKEN_EXPIRED', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      socialAccounts: {
        instagram: {
          isConnected: true,
          instagramId: '17841400012345678',
          accessTokenEnc: encryptSecret('EAARevokedToken'),
        },
      },
    };

    global.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: 'Error validating access token: The user has revoked authorization.',
          type: 'OAuthException',
          code: 190,
          error_subcode: 458,
        },
      }),
    });

    await assert.rejects(
      async () => {
        await publish({
          user,
          content: {
            caption: 'Test post',
            image_url: 'https://images.unsplash.com/photo-12345.jpg',
          },
        });
      },
      (err) => {
        assert.equal(err.code, 'TOKEN_EXPIRED');
        assert.equal(err.retryable, false);
        return true;
      },
    );
  });

  test('Publishing: Classifies HTTP 429 rate limit as retryable TRANSIENT_ERROR', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      socialAccounts: {
        instagram: {
          isConnected: true,
          instagramId: '17841400012345678',
          accessTokenEnc: encryptSecret('EAAToken'),
        },
      },
    };

    global.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({
        error: { message: 'User request limit reached', type: 'OAuthException', code: 4 },
      }),
    });

    await assert.rejects(
      async () => {
        await publish({
          user,
          content: {
            caption: 'Test post',
            image_url: 'https://images.unsplash.com/photo-12345.jpg',
          },
        });
      },
      (err) => {
        assert.equal(err.code, 'TRANSIENT_ERROR');
        assert.equal(err.retryable, true);
        return true;
      },
    );
  });
});
