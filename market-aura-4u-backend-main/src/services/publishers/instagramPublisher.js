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

function extractMetaErrorMessage(errorObj, fallbackMessage) {
  if (!errorObj || typeof errorObj !== 'object') return fallbackMessage;
  const parts = [];
  if (errorObj.error_user_title) parts.push(errorObj.error_user_title);
  if (errorObj.error_user_msg) parts.push(errorObj.error_user_msg);
  if (errorObj.message && !parts.some((p) => p.includes(errorObj.message))) {
    parts.push(errorObj.message);
  }
  const diagnostic = [
    errorObj.code ? `code: ${errorObj.code}` : null,
    errorObj.error_subcode ? `subcode: ${errorObj.error_subcode}` : null,
  ].filter(Boolean).join(', ');
  if (diagnostic) parts.push(`(${diagnostic})`);
  return parts.length > 0 ? parts.join(' - ') : fallbackMessage;
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
    const detail = extractMetaErrorMessage(data?.error, `Instagram container creation failed (HTTP ${res.status}).`);
    const err = classifyHttpError(res.status, detail);
    if (data?.error) {
      err.metaError = {
        code: data.error.code,
        subcode: data.error.error_subcode,
        type: data.error.type,
        message: data.error.message,
        userTitle: data.error.error_user_title,
        userMsg: data.error.error_user_msg,
        fbtraceId: data.error.fbtrace_id,
        httpStatus: res.status,
      };
    }
    throw err;
  }
  return data.id;
}

async function waitForIgContainer(containerId, accessToken) {
  for (let i = 0; i < 12; i += 1) {
    const res = await fetch(
      `${urls.instagram.graphApi}/v21.0/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = extractMetaErrorMessage(data?.error, 'Instagram container status check failed.');
      throw classifyHttpError(res.status, detail);
    }
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
      const detail = data.status || data?.error?.message || data.status_code;
      throw new PublisherError(`Instagram media processing failed (${detail}).`, {
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
    const isVideo = /\.(mp4|mov|m4v)(\?|$)/i.test(publicImages[0]);
    creationId = await createIgContainer(ig.instagramId, accessToken, {
      ...(isVideo
        ? { media_type: 'REELS', video_url: publicImages[0] }
        : { image_url: publicImages[0] }),
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
    const detail = extractMetaErrorMessage(publishData?.error, 'Instagram media publish failed.');
    throw classifyHttpError(publishRes.status, detail);
  }

  return {
    externalPostId: publishData?.id || null,
    externalPostUrl: ig.username ? `https://www.instagram.com/${ig.username}/` : null,
  };
}

module.exports = { publish, extractInstagramPayload };
