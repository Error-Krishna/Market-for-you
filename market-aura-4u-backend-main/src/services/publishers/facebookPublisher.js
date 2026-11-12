const urls = require('../../config/urls');
const { decryptSecret } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError, loadMediaBuffer } = require('./publisherErrors');

function extractFacebookText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === 'string' ? item.trim() : (item?.text ? String(item.text).trim() : '')))
      .filter(Boolean)
      .join('\n\n');
  }
  if (content && typeof content.text === 'string') return content.text.trim();
  return '';
}

async function publish({ user, content, mediaUrls = [] }) {
  const fb = user?.socialAccounts?.facebook;
  if (!fb?.isConnected || !fb?.pageId) {
    throw new PublisherError('Facebook Page is not connected.', { code: 'NOT_CONNECTED', retryable: false });
  }
  const pageToken = decryptSecret(fb.pageAccessTokenEnc);
  if (!pageToken) {
    throw new PublisherError('Facebook Page token missing. Please reconnect.', { code: 'TOKEN_EXPIRED', retryable: false });
  }

  const message = extractFacebookText(content);
  if (!message) {
    throw new PublisherError('Facebook post content cannot be empty.', { code: 'INVALID_CONTENT', retryable: false });
  }

  let res;
  try {
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      const { buffer, mimeType, filename } = await loadMediaBuffer(mediaUrls[0]);
      const form = new FormData();
      form.append('source', new Blob([buffer], { type: mimeType }), filename);
      form.append('caption', message);
      form.append('access_token', pageToken);

      res = await fetch(`${urls.facebook.graphApi}/${fb.pageId}/photos`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(25000),
      });
    } else {
      res = await fetch(`${urls.facebook.graphApi}/${fb.pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: pageToken }),
        signal: AbortSignal.timeout(20000),
      });
    }
  } catch (err) {
    if (err instanceof PublisherError) throw err;
    throw new PublisherError(`Facebook network error: ${err.message}`, { code: 'TRANSIENT_ERROR', retryable: true });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw classifyHttpError(res.status, data?.error?.message || `Facebook API HTTP ${res.status}`);
  }

  const postId = data?.post_id || data?.id || null;
  return {
    externalPostId: postId,
    externalPostUrl: postId ? `https://www.facebook.com/${postId}` : null,
  };
}

module.exports = { publish, extractFacebookText };
