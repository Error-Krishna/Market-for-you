const crypto = require('node:crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const { TwitterApi } = require('twitter-api-v2');
const User = require('../../models/User');
const OAuthState = require('../../models/OAuthState');
const SocialAccount = require('../../models/SocialAccount');
const urls = require('../../config/urls');
const { encryptSecret, decryptSecret, validatePublicHttpUrl } = require('../../utils/tokenCrypto');

const SUPPORTED_PLATFORMS = ['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog'];

function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function getBackendBaseUrl(req) {
  const configured = process.env.PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const protocol = req?.protocol || 'http';
  const host = req?.get?.('host') || `localhost:${process.env.PORT || 8000}`;
  return `${protocol}://${host}`;
}

function getRedirectUri(platform, req) {
  const envMap = {
    twitter: process.env.TWITTER_REDIRECT_URI,
    linkedin: process.env.LINKEDIN_REDIRECT_URI,
    instagram: process.env.INSTAGRAM_REDIRECT_URI,
    facebook: process.env.FACEBOOK_REDIRECT_URI,
  };
  const explicit = envMap[platform]?.trim();
  if (explicit) return explicit;
  return `${getBackendBaseUrl(req)}/api/v1/auth/social/${platform}/callback`;
}

function isServerConfigured(platform) {
  switch (platform) {
    case 'twitter':
      return Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
    case 'linkedin':
      return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    case 'instagram':
      return Boolean(
        (process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID)
        && (process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET)
      );
    case 'facebook':
      return Boolean(
        (process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID)
        && (process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET)
      );
    case 'email':
    case 'blog':
      return true; // Configured directly per user via API key / webhook / CMS credentials
    default:
      return false;
  }
}

function sanitizeSocialStatus(user) {
  const sa = user?.socialAccounts || {};
  return {
    timezone: user?.timezone || 'UTC',
    platforms: {
      twitter: {
        isConnected: Boolean(sa.twitter?.isConnected),
        serverConfigured: isServerConfigured('twitter'),
        username: sa.twitter?.username || null,
        name: sa.twitter?.name || null,
        expiresAt: sa.twitter?.expiresAt || null,
        connectedAt: sa.twitter?.connectedAt || null,
      },
      linkedin: {
        isConnected: Boolean(sa.linkedin?.isConnected),
        serverConfigured: isServerConfigured('linkedin'),
        name: sa.linkedin?.name || null,
        email: sa.linkedin?.email || null,
        expiresAt: sa.linkedin?.expiresAt || null,
        connectedAt: sa.linkedin?.connectedAt || null,
      },
      instagram: {
        isConnected: Boolean(sa.instagram?.isConnected),
        serverConfigured: isServerConfigured('instagram'),
        username: sa.instagram?.username || null,
        instagramId: sa.instagram?.instagramId || null,
        accountType: sa.instagram?.accountType || null,
        expiresAt: sa.instagram?.expiresAt || null,
        connectedAt: sa.instagram?.connectedAt || null,
      },
      facebook: {
        isConnected: Boolean(sa.facebook?.isConnected),
        serverConfigured: isServerConfigured('facebook'),
        pageId: sa.facebook?.pageId || null,
        pageName: sa.facebook?.pageName || null,
        pages: Array.isArray(sa.facebook?.pages)
          ? sa.facebook.pages.map((p) => ({ id: p.id, name: p.name }))
          : [],
        expiresAt: sa.facebook?.expiresAt || null,
        connectedAt: sa.facebook?.connectedAt || null,
      },
      email: {
        isConnected: Boolean(sa.email?.isConnected),
        serverConfigured: true,
        provider: sa.email?.provider || null,
        fromName: sa.email?.fromName || null,
        fromEmail: sa.email?.fromEmail || null,
        defaultRecipients: sa.email?.defaultRecipients || [],
        webhookUrl: sa.email?.webhookUrl || null,
        connectedAt: sa.email?.connectedAt || null,
      },
      blog: {
        isConnected: Boolean(sa.blog?.isConnected),
        serverConfigured: true,
        provider: sa.blog?.provider || null,
        siteUrl: sa.blog?.siteUrl || null,
        username: sa.blog?.username || null,
        publicationId: sa.blog?.publicationId || null,
        connectedAt: sa.blog?.connectedAt || null,
      },
    },
  };
}

const getSocialStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const statusData = sanitizeSocialStatus(user);
    const accounts = await SocialAccount.find({
      userId: req.user.id,
      connectionStatus: { $ne: 'disconnected' },
    }).sort({ createdAt: -1 });

    statusData.accounts = accounts.map((acc) => ({
      id: String(acc._id),
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
      username: acc.username,
      displayName: acc.displayName,
      profileImage: acc.profileImage,
      email: acc.email,
      tokenExpiry: acc.tokenExpiry,
      connectionStatus: acc.connectionStatus,
      lastConnectedAt: acc.lastConnectedAt,
      lastRefreshedAt: acc.lastRefreshedAt,
      metadata: acc.metadata,
    }));

    return res.status(200).json({ success: true, data: statusData });
  } catch (error) {
    console.error('Get social status failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load social connections' });
  }
};

const getConnectedAccounts = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({
      userId: req.user.id,
      connectionStatus: { $ne: 'disconnected' },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts.map((acc) => ({
        id: String(acc._id),
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        username: acc.username,
        displayName: acc.displayName,
        profileImage: acc.profileImage,
        email: acc.email,
        tokenExpiry: acc.tokenExpiry,
        connectionStatus: acc.connectionStatus,
        lastConnectedAt: acc.lastConnectedAt,
        lastRefreshedAt: acc.lastRefreshedAt,
        metadata: acc.metadata,
      })),
    });
  } catch (error) {
    console.error('Get connected accounts error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve connected accounts' });
  }
};

const updateTimezone = async (req, res) => {
  const { timezone } = req.body || {};
  if (typeof timezone !== 'string' || !timezone.trim()) {
    return res.status(400).json({ success: false, message: 'Valid IANA timezone is required.' });
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone.trim() });
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid IANA timezone identifier.' });
  }
  await User.findByIdAndUpdate(req.user.id, { timezone: timezone.trim() });
  return res.status(200).json({ success: true, timezone: timezone.trim() });
};

// ---------------- TWITTER / X OAuth 2.0 PKCE ----------------
const initTwitterConnect = async (req, res) => {
  if (!isServerConfigured('twitter')) {
    return res.status(400).json({
      success: false,
      code: 'PLATFORM_NOT_CONFIGURED',
      message: 'Twitter OAuth 2.0 credentials (TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET) are not configured on the server.',
    });
  }
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
    const redirectUri = getRedirectUri('twitter', req);
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(redirectUri, {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    });
    await OAuthState.create({
      state,
      userId: req.user.id,
      platform: 'twitter',
      codeVerifier,
    });
    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error('Twitter connect init error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate Twitter connection' });
  }
};

const twitterCallback = async (req, res) => {
  const frontend = getFrontendBaseUrl();
  const { state, code, error: oauthError } = req.query;
  if (oauthError) {
    return res.redirect(`${frontend}/social-accounts?error=${encodeURIComponent(String(oauthError))}&platform=twitter`);
  }
  if (!state || !code) {
    return res.redirect(`${frontend}/social-accounts?error=missing_code&platform=twitter`);
  }
  const stored = await OAuthState.findOneAndDelete({ state: String(state), platform: 'twitter' });
  if (!stored) {
    return res.redirect(`${frontend}/social-accounts?error=invalid_or_expired_state&platform=twitter`);
  }
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code: String(code),
      codeVerifier: stored.codeVerifier,
      redirectUri: getRedirectUri('twitter', req),
    });

    const me = await loggedClient.v2.me({ 'user.fields': ['profile_image_url'] }).catch(async () => loggedClient.v2.me());
    const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000) : null;
    const providerAccountId = String(me?.data?.id || `tw_${Date.now()}`);

    const encAccess = encryptSecret(accessToken);
    const encRefresh = refreshToken ? encryptSecret(refreshToken) : null;

    // Multi-tenant & multi-account storage in SocialAccount collection
    await SocialAccount.findOneAndUpdate(
      { userId: stored.userId, provider: 'twitter', providerAccountId },
      {
        $set: {
          username: me?.data?.username || null,
          displayName: me?.data?.name || null,
          profileImage: me?.data?.profile_image_url || null,
          encryptedAccessToken: encAccess,
          encryptedRefreshToken: encRefresh,
          tokenExpiry: expiresAt,
          grantedScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
          connectionStatus: 'connected',
          lastConnectedAt: new Date(),
          lastRefreshedAt: new Date(),
          lastError: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Backward-compatible sync with user.socialAccounts
    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.twitter': {
        isConnected: true,
        twitterUserId: me?.data?.id || null,
        username: me?.data?.username || null,
        name: me?.data?.name || null,
        accessTokenEnc: encAccess,
        refreshTokenEnc: encRefresh,
        expiresAt,
        connectedAt: new Date(),
      },
    });
    return res.redirect(`${frontend}/social-accounts?connected=twitter`);
  } catch (error) {
    console.error('Twitter OAuth callback error:', error.message);
    return res.redirect(`${frontend}/social-accounts?error=oauth_exchange_failed&platform=twitter`);
  }
};

// ---------------- LINKEDIN OAuth 2.0 ----------------
const initLinkedInConnect = async (req, res) => {
  if (!isServerConfigured('linkedin')) {
    return res.status(400).json({
      success: false,
      code: 'PLATFORM_NOT_CONFIGURED',
      message: 'LinkedIn OAuth credentials (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET) are not configured on the server.',
    });
  }
  try {
    const state = crypto.randomBytes(24).toString('hex');
    const redirectUri = getRedirectUri('linkedin', req);
    await OAuthState.create({
      state,
      userId: req.user.id,
      platform: 'linkedin',
    });
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile email w_member_social',
    });
    return res.status(200).json({
      success: true,
      url: `${urls.linkedin.oauthAuthorize}?${params.toString()}`,
    });
  } catch (error) {
    console.error('LinkedIn connect init error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate LinkedIn connection' });
  }
};

const linkedinCallback = async (req, res) => {
  const frontend = getFrontendBaseUrl();
  const { state, code, error: oauthError } = req.query;
  if (oauthError) {
    return res.redirect(`${frontend}/social-accounts?error=${encodeURIComponent(String(oauthError))}&platform=linkedin`);
  }
  if (!state || !code) {
    return res.redirect(`${frontend}/social-accounts?error=missing_code&platform=linkedin`);
  }
  const stored = await OAuthState.findOneAndDelete({ state: String(state), platform: 'linkedin' });
  if (!stored) {
    return res.redirect(`${frontend}/social-accounts?error=invalid_or_expired_state&platform=linkedin`);
  }
  try {
    const tokenRes = await axios.post(
      urls.linkedin.accessToken,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: getRedirectUri('linkedin', req),
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken } = tokenRes.data;
    const profileRes = await axios.get(`${urls.linkedin.apiBase}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileRes.data || {};
    const memberUrn = profile.sub ? `urn:li:person:${profile.sub}` : `li_${Date.now()}`;
    const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000) : null;

    const encAccess = encryptSecret(accessToken);
    const encRefresh = refreshToken ? encryptSecret(refreshToken) : null;

    // Multi-tenant & multi-account storage in SocialAccount collection
    await SocialAccount.findOneAndUpdate(
      { userId: stored.userId, provider: 'linkedin', providerAccountId: memberUrn },
      {
        $set: {
          displayName: profile.name || null,
          email: profile.email || null,
          profileImage: profile.picture || null,
          encryptedAccessToken: encAccess,
          encryptedRefreshToken: encRefresh,
          tokenExpiry: expiresAt,
          grantedScopes: ['openid', 'profile', 'email', 'w_member_social'],
          connectionStatus: 'connected',
          lastConnectedAt: new Date(),
          lastRefreshedAt: new Date(),
          lastError: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Backward-compatible sync with user.socialAccounts
    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.linkedin': {
        isConnected: true,
        memberUrn,
        name: profile.name || null,
        email: profile.email || null,
        accessTokenEnc: encAccess,
        refreshTokenEnc: encRefresh,
        expiresAt,
        connectedAt: new Date(),
      },
    });
    return res.redirect(`${frontend}/social-accounts?connected=linkedin`);
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error.response?.data || error.message);
    return res.redirect(`${frontend}/social-accounts?error=oauth_exchange_failed&platform=linkedin`);
  }
};

// ---------------- INSTAGRAM OAuth ----------------
const initInstagramConnect = async (req, res) => {
  if (!isServerConfigured('instagram')) {
    return res.status(400).json({
      success: false,
      code: 'PLATFORM_NOT_CONFIGURED',
      message: 'Meta App credentials (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET or INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET) are not configured on the server.',
    });
  }

  const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID;
  const configId = process.env.META_UNIFIED_CONFIG_ID?.trim();

  if (process.env.NODE_ENV === 'production' && !configId) {
    return res.status(500).json({
      success: false,
      code: 'CONFIGURATION_ERROR',
      message: 'META_UNIFIED_CONFIG_ID environment variable is required in production.',
    });
  }

  try {
    const state = crypto.randomBytes(24).toString('hex');
    await OAuthState.create({
      state,
      userId: req.user.id,
      platform: 'instagram',
    });

    const redirectUri = getRedirectUri('instagram', req);

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });

    if (configId) {
      params.set('config_id', configId);
    } else {
      params.set('scope', 'instagram_basic,instagram_content_publish,instagram_manage_messages');
    }

    return res.status(200).json({
      success: true,
      url: `${urls.instagram.oauthAuthorize}?${params.toString()}`,
    });
  } catch (error) {
    console.error('Instagram connect init error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate Instagram connection' });
  }
};

const instagramCallback = async (req, res) => {
  const frontend = getFrontendBaseUrl();
  const { state, code, error: oauthError, error_description } = req.query;
  if (oauthError) {
    return res.redirect(`${frontend}/social-accounts?error=${encodeURIComponent(String(error_description || oauthError))}&platform=instagram`);
  }
  if (!state || !code) {
    return res.redirect(`${frontend}/social-accounts?error=missing_code&platform=instagram`);
  }
  const stored = await OAuthState.findOneAndDelete({ state: String(state), platform: 'instagram' });
  if (!stored) {
    return res.redirect(`${frontend}/social-accounts?error=invalid_or_expired_state&platform=instagram`);
  }
  try {
    const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = getRedirectUri('instagram', req);

    // Exchange authorization code for token at graph.facebook.com
    const tokenRes = await axios.get(urls.instagram.accessToken, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: String(code),
      },
    });

    const accessToken = tokenRes.data.access_token;
    const tokenType = tokenRes.data.token_type || 'bearer';
    const expiresIn = Number(tokenRes.data.expires_in || 5184000); // 60 days default

    // Account Discovery Routine: Multi-fallback for Unified Login (SUAT) and standard User tokens
    let discoveredAccounts = [];

    // Method 1: /me/assigned_instagram_accounts (standard for Unified Login Business Integration SUAT)
    try {
      const assignedRes = await axios.get(`${urls.instagram.graphApi}/v21.0/me/assigned_instagram_accounts`, {
        params: {
          fields: 'id,username,name,profile_picture_url',
          access_token: accessToken,
        },
        timeout: 10000,
      });
      if (Array.isArray(assignedRes.data?.data) && assignedRes.data.data.length > 0) {
        discoveredAccounts = assignedRes.data.data.map((acc) => ({
          id: String(acc.id),
          username: acc.username || null,
          displayName: acc.name || (acc.username ? `@${acc.username}` : 'Instagram Professional'),
          profileImage: acc.profile_picture_url || null,
          accountType: 'BUSINESS',
        }));
      }
    } catch {
      // /me/assigned_instagram_accounts not available or token is page/user scoped
    }

    // Method 2: /me/accounts with instagram_business_account expansion (Page-linked fallback)
    if (discoveredAccounts.length === 0) {
      try {
        const pagesRes = await axios.get(`${urls.instagram.graphApi}/v21.0/me/accounts`, {
          params: {
            fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url}',
            access_token: accessToken,
          },
          timeout: 10000,
        });
        if (Array.isArray(pagesRes.data?.data)) {
          for (const page of pagesRes.data.data) {
            const igAcc = page.instagram_business_account;
            if (igAcc && igAcc.id) {
              discoveredAccounts.push({
                id: String(igAcc.id),
                username: igAcc.username || null,
                displayName: igAcc.name || (igAcc.username ? `@${igAcc.username}` : `${page.name} Instagram`),
                profileImage: igAcc.profile_picture_url || null,
                accountType: 'BUSINESS',
                linkedPageId: page.id,
              });
            }
          }
        }
      } catch {
        // Fallback to /me
      }
    }

    // Method 3: Direct /me fallback (if user access token)
    if (discoveredAccounts.length === 0) {
      try {
        const meRes = await axios.get(`${urls.instagram.graphApi}/v21.0/me`, {
          params: {
            fields: 'id,username,name,account_type',
            access_token: accessToken,
          },
          timeout: 10000,
        });
        if (meRes.data?.id && (meRes.data?.username || meRes.data?.account_type)) {
          discoveredAccounts.push({
            id: String(meRes.data.id),
            username: meRes.data.username || null,
            displayName: meRes.data.name || (meRes.data.username ? `@${meRes.data.username}` : 'Instagram Account'),
            profileImage: null,
            accountType: meRes.data.account_type || 'BUSINESS',
          });
        }
      } catch {
        // Direct /me failed
      }
    }

    if (discoveredAccounts.length === 0) {
      return res.redirect(`${frontend}/social-accounts?error=no_instagram_account_found&platform=instagram`);
    }

    const primaryAccount = discoveredAccounts[0];
    const providerAccountId = primaryAccount.id;
    const username = primaryAccount.username;
    const displayName = primaryAccount.displayName;
    const profileImage = primaryAccount.profileImage;
    const encAccess = encryptSecret(accessToken);

    // Multi-tenant & multi-account storage in SocialAccount collection
    await SocialAccount.findOneAndUpdate(
      { userId: stored.userId, provider: 'instagram', providerAccountId },
      {
        $set: {
          username: username || null,
          displayName: displayName || (username ? `@${username}` : 'Instagram Professional'),
          profileImage: profileImage || null,
          encryptedAccessToken: encAccess,
          tokenExpiry: new Date(Date.now() + expiresIn * 1000),
          grantedScopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_messages'],
          connectionStatus: 'connected',
          lastConnectedAt: new Date(),
          lastRefreshedAt: new Date(),
          metadata: {
            accountType: primaryAccount.accountType,
            discoveredAccountsCount: discoveredAccounts.length,
            tokenType,
            configId: process.env.META_UNIFIED_CONFIG_ID?.trim() || null,
          },
          lastError: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Backward-compatible sync with user.socialAccounts
    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.instagram': {
        isConnected: true,
        instagramId: providerAccountId,
        username,
        accountType: primaryAccount.accountType,
        accessTokenEnc: encAccess,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        connectedAt: new Date(),
      },
    });
    return res.redirect(`${frontend}/social-accounts?connected=instagram`);
  } catch (error) {
    console.error('Instagram OAuth callback error:', error.response?.data || error.message);
    return res.redirect(`${frontend}/social-accounts?error=oauth_exchange_failed&platform=instagram`);
  }
};

// ---------------- FACEBOOK PAGES OAuth ----------------
const initFacebookConnect = async (req, res) => {
  if (!isServerConfigured('facebook')) {
    return res.status(400).json({
      success: false,
      code: 'PLATFORM_NOT_CONFIGURED',
      message: 'Facebook App credentials (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) are not configured on the server.',
    });
  }
  try {
    const state = crypto.randomBytes(24).toString('hex');
    await OAuthState.create({
      state,
      userId: req.user.id,
      platform: 'facebook',
    });
    const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID;
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: getRedirectUri('facebook', req),
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
      response_type: 'code',
      state,
    });
    return res.status(200).json({
      success: true,
      url: `${urls.facebook.oauthAuthorize}?${params.toString()}`,
    });
  } catch (error) {
    console.error('Facebook connect init error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate Facebook connection' });
  }
};

const facebookCallback = async (req, res) => {
  const frontend = getFrontendBaseUrl();
  const { state, code, error: oauthError } = req.query;
  if (oauthError) {
    return res.redirect(`${frontend}/social-accounts?error=${encodeURIComponent(String(oauthError))}&platform=facebook`);
  }
  if (!state || !code) {
    return res.redirect(`${frontend}/social-accounts?error=missing_code&platform=facebook`);
  }
  const stored = await OAuthState.findOneAndDelete({ state: String(state), platform: 'facebook' });
  if (!stored) {
    return res.redirect(`${frontend}/social-accounts?error=invalid_or_expired_state&platform=facebook`);
  }
  try {
    const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;
    const tokenRes = await axios.get(`${urls.facebook.graphApi}/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: getRedirectUri('facebook', req),
        code: String(code),
      },
    });
    const userAccessToken = tokenRes.data.access_token;
    const expiresIn = Number(tokenRes.data.expires_in || 5184000);

    const pagesRes = await axios.get(`${urls.facebook.graphApi}/me/accounts`, {
      params: { fields: 'id,name,access_token', access_token: userAccessToken },
    });
    const rawPages = Array.isArray(pagesRes.data?.data) ? pagesRes.data.data : [];
    const pages = rawPages.map((p) => ({
      id: p.id,
      name: p.name,
      accessTokenEnc: encryptSecret(p.access_token),
    }));
    const firstPage = pages[0] || null;

    const encUserAccess = encryptSecret(userAccessToken);
    const encPageAccess = firstPage?.accessTokenEnc || encUserAccess;
    const providerAccountId = String(firstPage?.id || appId || `fb_${Date.now()}`);

    // Multi-tenant & multi-account storage in SocialAccount collection
    await SocialAccount.findOneAndUpdate(
      { userId: stored.userId, provider: 'facebook', providerAccountId },
      {
        $set: {
          displayName: firstPage?.name || 'Facebook Page',
          encryptedAccessToken: encPageAccess,
          tokenExpiry: new Date(Date.now() + expiresIn * 1000),
          grantedScopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
          connectionStatus: pages.length > 0 ? 'connected' : 'disconnected',
          lastConnectedAt: new Date(),
          lastRefreshedAt: new Date(),
          metadata: { pages, pageId: firstPage?.id || null, pageName: firstPage?.name || null },
          lastError: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Backward-compatible sync with user.socialAccounts
    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.facebook': {
        isConnected: pages.length > 0,
        pageId: firstPage?.id || null,
        pageName: firstPage?.name || null,
        userAccessTokenEnc: encUserAccess,
        pageAccessTokenEnc: encPageAccess,
        pages,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        connectedAt: new Date(),
      },
    });
    return res.redirect(`${frontend}/social-accounts?connected=facebook`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error.response?.data || error.message);
    return res.redirect(`${frontend}/social-accounts?error=oauth_exchange_failed&platform=facebook`);
  }
};

const selectFacebookPage = async (req, res) => {
  const { pageId } = req.body || {};
  if (typeof pageId !== 'string' || !pageId.trim()) {
    return res.status(400).json({ success: false, message: 'pageId is required.' });
  }
  const user = await User.findById(req.user.id);
  const pages = user?.socialAccounts?.facebook?.pages || [];
  const chosen = pages.find((p) => p.id === pageId.trim());
  if (!chosen) {
    return res.status(404).json({ success: false, message: 'Selected Facebook Page not found on account.' });
  }
  user.socialAccounts.facebook.pageId = chosen.id;
  user.socialAccounts.facebook.pageName = chosen.name;
  user.socialAccounts.facebook.pageAccessTokenEnc = chosen.accessTokenEnc;
  user.socialAccounts.facebook.isConnected = true;
  await user.save();

  // Also update SocialAccount record
  await SocialAccount.findOneAndUpdate(
    { userId: req.user.id, provider: 'facebook' },
    {
      $set: {
        providerAccountId: chosen.id,
        displayName: chosen.name,
        encryptedAccessToken: chosen.accessTokenEnc,
        'metadata.pageId': chosen.id,
        'metadata.pageName': chosen.name,
        connectionStatus: 'connected',
      },
    },
  );

  return res.status(200).json({ success: true, data: sanitizeSocialStatus(user) });
};

// ---------------- EMAIL & BLOG CONFIG CONNECTORS ----------------
const connectEmailAccount = async (req, res) => {
  const { provider, fromName = '', fromEmail, defaultRecipients = [], webhookUrl, apiKey } = req.body || {};
  if (!['resend', 'sendgrid', 'webhook'].includes(provider)) {
    return res.status(400).json({ success: false, message: 'Email provider must be resend, sendgrid, or webhook.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof fromEmail !== 'string' || !emailRegex.test(fromEmail.trim())) {
    return res.status(400).json({ success: false, message: 'Valid fromEmail address is required.' });
  }
  const recipients = Array.isArray(defaultRecipients)
    ? defaultRecipients.map((r) => String(r).trim()).filter((r) => emailRegex.test(r))
    : [];
  if (recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one valid recipient email address is required.' });
  }

  let validatedWebhook = null;
  if (provider === 'webhook') {
    validatedWebhook = validatePublicHttpUrl(webhookUrl, { allowHttpInDev: true });
    if (!validatedWebhook) {
      return res.status(400).json({ success: false, message: 'Valid HTTPS webhook URL is required.' });
    }
  } else if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(400).json({ success: false, message: 'Provider API key is required.' });
  }

  const encSecret = apiKey?.trim() ? encryptSecret(apiKey.trim()) : null;

  // Multi-tenant & multi-account storage in SocialAccount collection
  await SocialAccount.findOneAndUpdate(
    { userId: req.user.id, provider: 'email', providerAccountId: fromEmail.trim().toLowerCase() },
    {
      $set: {
        displayName: fromName?.trim() || fromEmail.trim(),
        email: fromEmail.trim(),
        encryptedAccessToken: encSecret || 'webhook',
        connectionStatus: 'connected',
        lastConnectedAt: new Date(),
        metadata: {
          provider,
          fromName: typeof fromName === 'string' ? fromName.trim().slice(0, 120) : '',
          fromEmail: fromEmail.trim(),
          defaultRecipients: recipients.slice(0, 50),
          webhookUrl: validatedWebhook,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'socialAccounts.email': {
        isConnected: true,
        provider,
        fromName: typeof fromName === 'string' ? fromName.trim().slice(0, 120) : '',
        fromEmail: fromEmail.trim(),
        defaultRecipients: recipients.slice(0, 50),
        webhookUrl: validatedWebhook,
        secretEnc: encSecret,
        connectedAt: new Date(),
      },
    },
    { new: true },
  );
  return res.status(200).json({ success: true, message: 'Email publishing configured', data: sanitizeSocialStatus(user) });
};

const connectBlogAccount = async (req, res) => {
  const { provider, siteUrl, username = '', publicationId = '', apiSecret } = req.body || {};
  if (!['wordpress', 'hashnode', 'ghost', 'webhook'].includes(provider)) {
    return res.status(400).json({ success: false, message: 'Blog provider must be wordpress, hashnode, ghost, or webhook.' });
  }
  const validatedSite = validatePublicHttpUrl(siteUrl, { allowHttpInDev: true });
  if (!validatedSite) {
    return res.status(400).json({ success: false, message: 'Valid public site or webhook URL is required.' });
  }
  if (provider === 'wordpress' && (!username.trim() || !apiSecret?.trim())) {
    return res.status(400).json({ success: false, message: 'WordPress requires username and Application Password.' });
  }
  if ((provider === 'hashnode' || provider === 'ghost') && !apiSecret?.trim()) {
    return res.status(400).json({ success: false, message: `${provider} requires an API access token/key.` });
  }

  const encSecret = apiSecret?.trim() ? encryptSecret(apiSecret.trim()) : null;

  // Multi-tenant & multi-account storage in SocialAccount collection
  await SocialAccount.findOneAndUpdate(
    { userId: req.user.id, provider: 'blog', providerAccountId: validatedSite.replace(/\/+$/, '') },
    {
      $set: {
        displayName: username ? `${username} (${provider})` : `${provider} blog`,
        username: username ? username.trim() : null,
        encryptedAccessToken: encSecret || 'webhook',
        connectionStatus: 'connected',
        lastConnectedAt: new Date(),
        metadata: {
          provider,
          siteUrl: validatedSite.replace(/\/+$/, ''),
          username: typeof username === 'string' ? username.trim() : '',
          publicationId: typeof publicationId === 'string' ? publicationId.trim() : '',
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'socialAccounts.blog': {
        isConnected: true,
        provider,
        siteUrl: validatedSite.replace(/\/+$/, ''),
        username: typeof username === 'string' ? username.trim() : '',
        publicationId: typeof publicationId === 'string' ? publicationId.trim() : '',
        secretEnc: encSecret,
        connectedAt: new Date(),
      },
    },
    { new: true },
  );
  return res.status(200).json({ success: true, message: 'Blog publishing configured', data: sanitizeSocialStatus(user) });
};

// Disconnect single account by its database _id (Multi-account isolation & IDOR protected)
const disconnectAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID.' });
    }

    const account = await SocialAccount.findOne({ _id: id, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Connected account not found.' });
    }

    account.connectionStatus = 'disconnected';
    account.encryptedAccessToken = null;
    account.encryptedRefreshToken = null;
    await account.save();

    // Check if user still has other connected accounts for this platform
    let otherQuery = SocialAccount.findOne({
      userId: req.user.id,
      provider: account.provider,
      connectionStatus: 'connected',
    });
    if (typeof otherQuery?.select === 'function') {
      otherQuery = otherQuery.select('+encryptedAccessToken +encryptedRefreshToken');
    }
    const otherAccount = await otherQuery;

    const user = await User.findById(req.user.id);
    if (user && user.socialAccounts) {
      if (otherAccount) {
        if (account.provider === 'twitter') {
          user.socialAccounts.twitter = {
            isConnected: true,
            twitterUserId: otherAccount.providerAccountId,
            username: otherAccount.username,
            name: otherAccount.displayName,
            accessTokenEnc: otherAccount.encryptedAccessToken,
            refreshTokenEnc: otherAccount.encryptedRefreshToken,
            expiresAt: otherAccount.tokenExpiry,
            connectedAt: otherAccount.lastConnectedAt,
          };
        } else if (account.provider === 'linkedin') {
          user.socialAccounts.linkedin = {
            isConnected: true,
            memberUrn: otherAccount.providerAccountId,
            name: otherAccount.displayName,
            email: otherAccount.email,
            accessTokenEnc: otherAccount.encryptedAccessToken,
            refreshTokenEnc: otherAccount.encryptedRefreshToken,
            expiresAt: otherAccount.tokenExpiry,
            connectedAt: otherAccount.lastConnectedAt,
          };
        } else if (account.provider === 'instagram') {
          user.socialAccounts.instagram = {
            isConnected: true,
            instagramId: otherAccount.providerAccountId,
            username: otherAccount.username,
            accountType: otherAccount.metadata?.accountType || null,
            accessTokenEnc: otherAccount.encryptedAccessToken,
            expiresAt: otherAccount.tokenExpiry,
            connectedAt: otherAccount.lastConnectedAt,
          };
        } else if (account.provider === 'facebook') {
          user.socialAccounts.facebook = {
            isConnected: true,
            pageId: otherAccount.providerAccountId,
            pageName: otherAccount.displayName,
            pageAccessTokenEnc: otherAccount.encryptedAccessToken,
            pages: otherAccount.metadata?.pages || [],
            expiresAt: otherAccount.tokenExpiry,
            connectedAt: otherAccount.lastConnectedAt,
          };
        }
      } else {
        if (user.socialAccounts[account.provider]) {
          user.socialAccounts[account.provider].isConnected = false;
        }
      }
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: `${account.provider} account disconnected successfully.`,
      data: sanitizeSocialStatus(user),
    });
  } catch (error) {
    console.error('Disconnect account by ID error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to disconnect account.' });
  }
};

// Disconnect all accounts for a platform (backward-compatible)
const disconnectPlatform = async (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ success: false, message: 'Unsupported platform.' });
  }

  await SocialAccount.updateMany(
    { userId: req.user.id, provider: platform },
    {
      $set: {
        connectionStatus: 'disconnected',
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
      },
    },
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { [`socialAccounts.${platform}.isConnected`]: false },
    { new: true },
  );
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  return res.status(200).json({ success: true, message: `${platform} disconnected`, data: sanitizeSocialStatus(user) });
};

// Refresh token for an individual account
const refreshSocialAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid account ID.' });
    }

    let accQuery = SocialAccount.findOne({ _id: id, userId: req.user.id });
    if (typeof accQuery?.select === 'function') {
      accQuery = accQuery.select('+encryptedAccessToken +encryptedRefreshToken');
    }
    const account = await accQuery;

    if (!account) {
      return res.status(404).json({ success: false, message: 'Connected account not found.' });
    }

    if (account.provider === 'twitter') {
      const refreshToken = decryptSecret(account.encryptedRefreshToken);
      if (!refreshToken || !process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        return res.status(400).json({
          success: false,
          code: 'TOKEN_REFRESH_UNAVAILABLE',
          message: 'Cannot refresh Twitter token: missing client credentials or refresh token.',
        });
      }
      const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });
      const refreshed = await client.refreshOAuth2Token(refreshToken);
      const expiresAt = refreshed.expiresIn ? new Date(Date.now() + Number(refreshed.expiresIn) * 1000) : null;

      account.encryptedAccessToken = encryptSecret(refreshed.accessToken);
      if (refreshed.refreshToken) {
        account.encryptedRefreshToken = encryptSecret(refreshed.refreshToken);
      }
      account.tokenExpiry = expiresAt;
      account.connectionStatus = 'connected';
      account.lastRefreshedAt = new Date();
      account.lastError = null;
      await account.save();

      await User.findByIdAndUpdate(req.user.id, {
        'socialAccounts.twitter.accessTokenEnc': account.encryptedAccessToken,
        ...(account.encryptedRefreshToken ? { 'socialAccounts.twitter.refreshTokenEnc': account.encryptedRefreshToken } : {}),
        'socialAccounts.twitter.expiresAt': expiresAt,
      });

      return res.status(200).json({ success: true, message: 'Twitter token refreshed successfully.', account });
    }

    return res.status(200).json({ success: true, message: 'Account status checked.', account });
  } catch (error) {
    console.error('Refresh social account error:', error.message);
    return res.status(500).json({ success: false, message: `Failed to refresh token: ${error.message}` });
  }
};

module.exports = {
  getSocialStatus,
  getConnectedAccounts,
  disconnectAccountById,
  refreshSocialAccount,
  updateTimezone,
  initTwitterConnect,
  twitterCallback,
  initLinkedInConnect,
  linkedinCallback,
  initInstagramConnect,
  instagramCallback,
  initFacebookConnect,
  facebookCallback,
  selectFacebookPage,
  connectEmailAccount,
  connectBlogAccount,
  disconnectPlatform,
  sanitizeSocialStatus,
};
