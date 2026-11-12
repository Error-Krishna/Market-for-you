const { decryptSecret } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError } = require('./publisherErrors');

function extractBlogPayload(content, fallbackTitle = 'New Article') {
  let rawText = '';
  let explicitTitle = '';
  if (typeof content === 'string') {
    rawText = content.trim();
  } else if (Array.isArray(content)) {
    rawText = content.map((c) => String(c || '').trim()).filter(Boolean).join('\n\n');
  } else if (content && typeof content === 'object') {
    explicitTitle = String(content.title || '').trim();
    rawText = String(content.body || content.content || content.text || '').trim();
  }

  if (!explicitTitle && rawText) {
    const firstLine = rawText.split('\n')[0].replace(/^#+\s*/, '').trim();
    explicitTitle = firstLine.slice(0, 120) || fallbackTitle;
  }

  return {
    title: explicitTitle || fallbackTitle,
    body: rawText,
  };
}

async function publish({ user, content, mediaUrls = [], title: fallbackTitle }) {
  const blogCfg = user?.socialAccounts?.blog;
  if (!blogCfg?.isConnected || !blogCfg?.provider || !blogCfg?.siteUrl) {
    throw new PublisherError('Blog publishing destination is not connected.', { code: 'NOT_CONNECTED', retryable: false });
  }

  const secret = decryptSecret(blogCfg.secretEnc);
  const { title, body } = extractBlogPayload(content, fallbackTitle);
  if (!body) {
    throw new PublisherError('Blog post content cannot be empty.', { code: 'INVALID_CONTENT', retryable: false });
  }

  let res;
  try {
    if (blogCfg.provider === 'wordpress') {
      if (!blogCfg.username || !secret) {
        throw new PublisherError('WordPress credentials missing.', { code: 'TOKEN_EXPIRED', retryable: false });
      }
      const basicAuth = Buffer.from(`${blogCfg.username}:${secret}`).toString('base64');
      res = await fetch(`${blogCfg.siteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content: body, status: 'publish' }),
        signal: AbortSignal.timeout(20000),
      });
    } else if (blogCfg.provider === 'hashnode') {
      if (!secret || !blogCfg.publicationId) {
        throw new PublisherError('Hashnode token and publicationId are required.', { code: 'INVALID_CONTENT', retryable: false });
      }
      res = await fetch('https://gql.hashnode.com/', {
        method: 'POST',
        headers: {
          Authorization: secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation PublishPost($input: PublishPostInput!) {
            publishPost(input: $input) { post { id url } }
          }`,
          variables: {
            input: {
              title,
              contentMarkdown: body,
              publicationId: blogCfg.publicationId,
              ...(mediaUrls[0] ? { coverImageOptions: { coverImageURL: mediaUrls[0] } } : {}),
            },
          },
        }),
        signal: AbortSignal.timeout(20000),
      });
    } else if (blogCfg.provider === 'ghost') {
      if (!secret) throw new PublisherError('Ghost Admin key/token missing.', { code: 'TOKEN_EXPIRED', retryable: false });
      res = await fetch(`${blogCfg.siteUrl}/ghost/api/admin/posts/`, {
        method: 'POST',
        headers: {
          Authorization: `Ghost ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ posts: [{ title, html: `<p>${body.replace(/\n\n/g, '</p><p>')}</p>`, status: 'published' }] }),
        signal: AbortSignal.timeout(20000),
      });
    } else if (blogCfg.provider === 'webhook') {
      res = await fetch(blogCfg.siteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ title, content: body, mediaUrls }),
        signal: AbortSignal.timeout(20000),
      });
    } else {
      throw new PublisherError('Unsupported blog provider.', { code: 'INVALID_CONTENT', retryable: false });
    }
  } catch (err) {
    if (err instanceof PublisherError) throw err;
    throw new PublisherError(`Blog network error: ${err.message}`, { code: 'TRANSIENT_ERROR', retryable: true });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw classifyHttpError(res.status, data?.message || data?.errors?.[0]?.message || `Blog API HTTP ${res.status}`);
  }
  if (blogCfg.provider === 'hashnode' && Array.isArray(data?.errors) && data.errors.length > 0) {
    throw new PublisherError(data.errors[0].message || 'Hashnode GraphQL error.', { code: 'PLATFORM_API_ERROR', retryable: false });
  }

  const externalPostId = data?.id || data?.data?.publishPost?.post?.id || data?.posts?.[0]?.id || null;
  const externalPostUrl = data?.link || data?.url || data?.data?.publishPost?.post?.url || data?.posts?.[0]?.url || null;

  return {
    externalPostId: externalPostId ? String(externalPostId) : null,
    externalPostUrl: externalPostUrl || null,
  };
}

module.exports = { publish, extractBlogPayload };
