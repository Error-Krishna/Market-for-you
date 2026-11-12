const { TwitterApi } = require('twitter-api-v2');
const User = require('../../models/User');
const urls = require('../../config/urls');
const { decryptSecret, encryptSecret } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError, loadMediaBuffer } = require('./publisherErrors');

function extractTweetText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (typeof first === 'string') return first.trim();
    if (first && typeof first.text === 'string') return first.text.trim();
  }
  if (content && typeof content.text === 'string') return content.text.trim();
  return '';
}

async function ensureFreshTwitterToken(user) {
  const tw = user?.socialAccounts?.twitter;
  if (!tw?.isConnected) {
    throw new PublisherError('Twitter / X account is not connected.', { code: 'NOT_CONNECTED', retryable: false });
  }
  const accessToken = decryptSecret(tw.accessTokenEnc);
  const refreshToken = decryptSecret(tw.refreshTokenEnc);
  if (!accessToken) {
    throw new PublisherError('Twitter / X access token is missing. Please reconnect.', { code: 'TOKEN_EXPIRED', retryable: false });
  }

  const expiresAtMs = tw.expiresAt ? new Date(tw.expiresAt).getTime() : 0;
  const needsRefresh = expiresAtMs > 0 && expiresAtMs <= Date.now() + 5 * 60 * 1000;

  if (!needsRefresh) return accessToken;

  if (!refreshToken || !process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    throw new PublisherError('Twitter / X token expired and cannot be refreshed. Please reconnect.', {
      code: 'TOKEN_EXPIRED',
      retryable: false,
    });
  }

  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
    const refreshed = await client.refreshOAuth2Token(refreshToken);
    const nextExpires = refreshed.expiresIn ? new Date(Date.now() + Number(refreshed.expiresIn) * 1000) : null;
    await User.findByIdAndUpdate(user._id, {
      'socialAccounts.twitter.accessTokenEnc': encryptSecret(refreshed.accessToken),
      ...(refreshed.refreshToken ? { 'socialAccounts.twitter.refreshTokenEnc': encryptSecret(refreshed.refreshToken) } : {}),
      'socialAccounts.twitter.expiresAt': nextExpires,
    });
    return refreshed.accessToken;
  } catch (err) {
    throw new PublisherError(`Twitter / X token refresh failed: ${err.message}`, {
      code: 'TOKEN_EXPIRED',
      retryable: false,
    });
  }
}

async function uploadMediaIfConfigured(mediaUrls) {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return [];
  if (
    !process.env.TWITTER_API_KEY
    || !process.env.TWITTER_API_SECRET
    || !process.env.TWITTER_ACCESS_TOKEN
    || !process.env.TWITTER_ACCESS_SECRET
  ) {
    return [];
  }
  const oauth1Client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  const mediaIds = [];
  for (const mediaUrl of mediaUrls.slice(0, 4)) {
    const { buffer, mimeType } = await loadMediaBuffer(mediaUrl);
    const id = await oauth1Client.v1.uploadMedia(buffer, { mimeType });
    if (id) mediaIds.push(id);
  }
  return mediaIds;
}

async function publish({ user, content, mediaUrls = [] }) {
  const text = extractTweetText(content);
  if (!text) {
    throw new PublisherError('Tweet text is empty.', { code: 'INVALID_CONTENT', retryable: false });
  }
  if (Array.from(text).length > 280) {
    throw new PublisherError('Tweet exceeds 280 characters.', { code: 'INVALID_CONTENT', retryable: false });
  }

  const accessToken = await ensureFreshTwitterToken(user);
  const payload = { text };

  const attachedMedia = mediaUrls.length > 0
    ? mediaUrls
    : (content?.[0]?.image_url && !String(content[0].image_url).includes('loremflickr.com') ? [content[0].image_url] : []);

  if (attachedMedia.length > 0) {
    const mediaIds = await uploadMediaIfConfigured(attachedMedia);
    if (mediaIds.length > 0) {
      payload.media = { media_ids: mediaIds };
    }
  }

  let res;
  try {
    res = await fetch(`${urls.twitter.apiBase}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new PublisherError(`Twitter network error: ${err.message}`, { code: 'TRANSIENT_ERROR', retryable: true });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw classifyHttpError(res.status, data?.detail || data?.title || data?.error || `Twitter API HTTP ${res.status}`);
  }

  const tweetId = data?.data?.id;
  return {
    externalPostId: tweetId || null,
    externalPostUrl: tweetId ? `https://x.com/i/web/status/${tweetId}` : null,
  };
}

module.exports = { publish, extractTweetText };
