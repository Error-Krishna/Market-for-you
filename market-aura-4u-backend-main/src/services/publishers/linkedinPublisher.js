const urls = require('../../config/urls');
const { decryptSecret } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError, loadMediaBuffer } = require('./publisherErrors');

function extractLinkedInText(content) {
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

async function uploadImageToLinkedIn(accessToken, memberUrn, mediaUrl) {
  const { buffer, mimeType } = await loadMediaBuffer(mediaUrl);
  const initRes = await fetch(`${urls.linkedin.apiBase}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202501',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: { owner: memberUrn },
    }),
    signal: AbortSignal.timeout(20000),
  });

  const initData = await initRes.json().catch(() => ({}));
  if (!initRes.ok) {
    throw classifyHttpError(initRes.status, initData?.message || 'LinkedIn image upload initialization failed.');
  }

  const uploadUrl = initData?.value?.uploadUrl;
  const imageUrn = initData?.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new PublisherError('LinkedIn did not return an image upload URL.', { code: 'PLATFORM_API_ERROR', retryable: false });
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer,
    signal: AbortSignal.timeout(30000),
  });
  if (!putRes.ok) {
    throw classifyHttpError(putRes.status, 'LinkedIn image binary upload failed.');
  }

  return imageUrn;
}

async function publish({ user, content, mediaUrls = [] }) {
  const li = user?.socialAccounts?.linkedin;
  if (!li?.isConnected || !li?.memberUrn) {
    throw new PublisherError('LinkedIn account is not connected.', { code: 'NOT_CONNECTED', retryable: false });
  }
  if (li.expiresAt && new Date(li.expiresAt).getTime() <= Date.now()) {
    throw new PublisherError('LinkedIn access token has expired. Please reconnect.', { code: 'TOKEN_EXPIRED', retryable: false });
  }
  const accessToken = decryptSecret(li.accessTokenEnc);
  if (!accessToken) {
    throw new PublisherError('LinkedIn access token missing. Please reconnect.', { code: 'TOKEN_EXPIRED', retryable: false });
  }

  const commentary = extractLinkedInText(content);
  if (!commentary) {
    throw new PublisherError('LinkedIn post content cannot be empty.', { code: 'INVALID_CONTENT', retryable: false });
  }
  if (commentary.length > 3000) {
    throw new PublisherError('LinkedIn post exceeds 3000 characters.', { code: 'INVALID_CONTENT', retryable: false });
  }

  const body = {
    author: li.memberUrn,
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    const imageUrn = await uploadImageToLinkedIn(accessToken, li.memberUrn, mediaUrls[0]);
    body.content = {
      media: {
        title: 'Post Media',
        id: imageUrn,
      },
    };
  }

  let res;
  try {
    res = await fetch(`${urls.linkedin.apiBase}/rest/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new PublisherError(`LinkedIn network error: ${err.message}`, { code: 'TRANSIENT_ERROR', retryable: true });
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw classifyHttpError(res.status, errData?.message || `LinkedIn API HTTP ${res.status}`);
  }

  const postUrn = res.headers.get('x-restli-id') || null;
  return {
    externalPostId: postUrn,
    externalPostUrl: postUrn ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}/` : null,
  };
}

module.exports = { publish, extractLinkedInText };
