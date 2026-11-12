const crypto = require('node:crypto');
const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');
const User = require('../../models/User');
const OAuthState = require('../../models/OAuthState');
const urls = require('../../config/urls');
const { encryptSecret, validatePublicHttpUrl } = require('../../utils/tokenCrypto');

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
      return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
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
    return res.status(200).json({ success: true, data: sanitizeSocialStatus(user) });
  } catch (error) {
    console.error('Get social status failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load social connections' });
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

    const me = await loggedClient.v2.me();
    const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000) : null;

    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.twitter': {
        isConnected: true,
        twitterUserId: me?.data?.id || null,
        username: me?.data?.username || null,
        name: me?.data?.name || null,
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : null,
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
    const memberUrn = profile.sub ? `urn:li:person:${profile.sub}` : null;
    const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000) : null;

    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.linkedin': {
        isConnected: true,
        memberUrn,
        name: profile.name || null,
        email: profile.email || null,
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: refreshToken ? encryptSecret(refreshToken) : null,
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
      message: 'Instagram App credentials (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET) are not configured on the server.',
    });
  }
  try {
    const state = crypto.randomBytes(24).toString('hex');
    await OAuthState.create({
      state,
      userId: req.user.id,
      platform: 'instagram',
    });
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID,
      redirect_uri: getRedirectUri('instagram', req),
      scope: 'instagram_business_basic,instagram_business_content_publish',
      response_type: 'code',
      state,
    });
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
  const { state, code, error: oauthError } = req.query;
  if (oauthError) {
    return res.redirect(`${frontend}/social-accounts?error=${encodeURIComponent(String(oauthError))}&platform=instagram`);
  }
  if (!state || !code) {
    return res.redirect(`${frontend}/social-accounts?error=missing_code&platform=instagram`);
  }
  const stored = await OAuthState.findOneAndDelete({ state: String(state), platform: 'instagram' });
  if (!stored) {
    return res.redirect(`${frontend}/social-accounts?error=invalid_or_expired_state&platform=instagram`);
  }
  try {
    const shortRes = await axios.post(
      urls.instagram.accessToken,
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: getRedirectUri('instagram', req),
        code: String(code),
      }),
    );
    const { access_token: shortToken, user_id: igUserId } = shortRes.data;

    const longRes = await axios.get(`${urls.instagram.graphApi}/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        access_token: shortToken,
      },
    });
    const longToken = longRes.data.access_token;
    const expiresIn = Number(longRes.data.expires_in || 5184000);

    let username = null;
    let accountType = null;
    try {
      const meRes = await axios.get(`${urls.instagram.graphApi}/me`, {
        params: { fields: 'id,username,account_type', access_token: longToken },
      });
      username = meRes.data?.username || null;
      accountType = meRes.data?.account_type || null;
    } catch {
      // Optional profile lookup failure does not invalidate token exchange.
    }

    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.instagram': {
        isConnected: true,
        instagramId: String(igUserId),
        username,
        accountType,
        accessTokenEnc: encryptSecret(longToken),
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

    await User.findByIdAndUpdate(stored.userId, {
      'socialAccounts.facebook': {
        isConnected: pages.length > 0,
        pageId: firstPage?.id || null,
        pageName: firstPage?.name || null,
        userAccessTokenEnc: encryptSecret(userAccessToken),
        pageAccessTokenEnc: firstPage?.accessTokenEnc || null,
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
        secretEnc: apiKey?.trim() ? encryptSecret(apiKey.trim()) : null,
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

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'socialAccounts.blog': {
        isConnected: true,
        provider,
        siteUrl: validatedSite.replace(/\/+$/, ''),
        username: typeof username === 'string' ? username.trim() : '',
        publicationId: typeof publicationId === 'string' ? publicationId.trim() : '',
        secretEnc: apiSecret?.trim() ? encryptSecret(apiSecret.trim()) : null,
        connectedAt: new Date(),
      },
    },
    { new: true },
  );
  return res.status(200).json({ success: true, message: 'Blog publishing configured', data: sanitizeSocialStatus(user) });
};

const disconnectPlatform = async (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ success: false, message: 'Unsupported platform.' });
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { [`socialAccounts.${platform}`]: { isConnected: false } },
    { new: true },
  );
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  return res.status(200).json({ success: true, message: `${platform} disconnected`, data: sanitizeSocialStatus(user) });
};

module.exports = {
  getSocialStatus,
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
