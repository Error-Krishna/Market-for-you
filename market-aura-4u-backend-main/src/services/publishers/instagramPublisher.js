const urls = require('../../config/urls');
const { decryptSecret, validatePublicHttpUrl } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError } = require('./publisherErrors');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractInstagramPayload(content, mediaUrls = []) {
  const caption = typeof content === 'string'
    ? content.trim()
    : (typeof content?.caption === 'string' ? content.caption.trim() : (typeof content?.text === 'string' ? content.text.trim() : ''));

  const images = Array.isArray(mediaUrls) && mediaUrls.length > 0
    ? mediaUrls
    : (content?.image_url ? [content.image_url] : []);

  return { caption, images };
}

async function createIgContainer(igId, accessToken, params) {
  const res = await fetch(`${urls.instagram.graphApi}/v21.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, access_token: accessToken }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw classifyHttpError(res.status, data?.error?.message || `Instagram container creation failed (HTTP ${res.status}).`);
  }
  return data.id;
}

async function waitForIgContainer(containerId, accessToken) {
  for (let i = 0; i < 12; i += 1) {
    const res = await fetch(
      `${urls.instagram.graphApi}/v21.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw classifyHttpError(res.status, data?.error?.message || 'Instagram container status check failed.');
    }
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
      throw new PublisherError(`Instagram media processing failed (${data.status_code}).`, {
        code: 'PLATFORM_API_ERROR',
        retryable: false,
      });
    }
    await sleep(3000);
  }
  throw new PublisherError('Instagram media processing timed out.', { code: 'TRANSIENT_ERROR', retryable: true });
}

async function publish({ user, content, mediaUrls = [] }) {
  const ig = user?.socialAccounts?.instagram;
  if (!ig?.isConnected || !ig?.instagramId) {
    throw new PublisherError('Instagram Business/Creator account is not connected.', { code: 'NOT_CONNECTED', retryable: false });
  }
  if (ig.expiresAt && new Date(ig.expiresAt).getTime() <= Date.now()) {
    throw new PublisherError('Instagram token has expired. Please reconnect.', { code: 'TOKEN_EXPIRED', retryable: false });
  }
  const accessToken = decryptSecret(ig.accessTokenEnc) || ig.accessToken;
  if (!accessToken) {
    throw new PublisherError('Instagram access token missing. Please reconnect.', { code: 'TOKEN_EXPIRED', retryable: false });
  }

  const { caption, images } = extractInstagramPayload(content, mediaUrls);
  if (!caption) {
    throw new PublisherError('Instagram caption cannot be empty.', { code: 'INVALID_CONTENT', retryable: false });
  }

  const publicImages = images
    .map((img) => validatePublicHttpUrl(img, { allowHttpInDev: false }))
    .filter(Boolean);

  if (publicImages.length === 0) {
    throw new PublisherError(
      'Instagram requires at least one publicly accessible HTTPS image URL. Attach a public image URL or configure PUBLIC_BACKEND_URL.',
      { code: 'MEDIA_REQUIRED', retryable: false },
    );
  }

  let creationId;
  if (publicImages.length > 1) {
    const childIds = [];
    for (const imgUrl of publicImages.slice(0, 10)) {
      const childId = await createIgContainer(ig.instagramId, accessToken, {
        image_url: imgUrl,
        is_carousel_item: true,
      });
      await waitForIgContainer(childId, accessToken);
      childIds.push(childId);
    }
    creationId = await createIgContainer(ig.instagramId, accessToken, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
    });
  } else {
    creationId = await createIgContainer(ig.instagramId, accessToken, {
      image_url: publicImages[0],
      caption,
    });
  }

  await waitForIgContainer(creationId, accessToken);

  const publishRes = await fetch(`${urls.instagram.graphApi}/v21.0/${ig.instagramId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    signal: AbortSignal.timeout(20000),
  });
  const publishData = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok) {
    throw classifyHttpError(publishRes.status, publishData?.error?.message || 'Instagram media publish failed.');
  }

  return {
    externalPostId: publishData?.id || null,
    externalPostUrl: ig.username ? `https://www.instagram.com/${ig.username}/` : null,
  };
}

module.exports = { publish, extractInstagramPayload };
