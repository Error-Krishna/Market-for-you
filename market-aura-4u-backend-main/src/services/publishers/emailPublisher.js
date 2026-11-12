const path = require('node:path');
const { decryptSecret, validatePublicHttpUrl } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError, loadMediaBuffer } = require('./publisherErrors');

const MAX_EMAIL_ATTACHMENTS = 10;
const PROVIDER_MAX_PAYLOAD_BYTES = {
  resend: 38 * 1024 * 1024, // Resend enforces a 40 MB total JSON/base64 ceiling
  sendgrid: 28 * 1024 * 1024, // SendGrid enforces a 30 MB total message ceiling
  webhook: 28 * 1024 * 1024,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isPublicExternalUrl(rawUrl) {
  return Boolean(validatePublicHttpUrl(rawUrl, { allowHttpInDev: false }));
}

function uniqueFilename(rawFilename, usedNames) {
  const baseName = rawFilename || 'attachment';
  if (!usedNames.has(baseName.toLowerCase())) {
    usedNames.add(baseName.toLowerCase());
    return baseName;
  }
  const ext = path.extname(baseName);
  const stem = ext ? baseName.slice(0, -ext.length) : baseName;
  let counter = 2;
  let candidate = `${stem}-${counter}${ext}`;
  while (usedNames.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${stem}-${counter}${ext}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function resolveEmailAttachments(mediaUrls, bodyText, provider) {
  const uniqueUrls = [
    ...new Set(
      (Array.isArray(mediaUrls) ? mediaUrls : [])
        .filter((u) => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim()),
    ),
  ];

  if (uniqueUrls.length === 0) return { uniqueUrls: [], attachments: [] };
  if (uniqueUrls.length > MAX_EMAIL_ATTACHMENTS) {
    throw new PublisherError(`You can attach at most ${MAX_EMAIL_ATTACHMENTS} media files per email.`, {
      code: 'INVALID_MEDIA',
      retryable: false,
    });
  }

  const maxPayloadBytes = PROVIDER_MAX_PAYLOAD_BYTES[provider] || PROVIDER_MAX_PAYLOAD_BYTES.sendgrid;
  let totalEncodedBytes = Buffer.byteLength(bodyText || '', 'utf8');
  const usedNames = new Set();
  const attachments = [];

  for (let idx = 0; idx < uniqueUrls.length; idx += 1) {
    const url = uniqueUrls[idx];
    const { buffer, mimeType, filename } = await loadMediaBuffer(url);
    const contentBase64 = buffer.toString('base64');
    totalEncodedBytes += contentBase64.length;

    if (totalEncodedBytes > maxPayloadBytes) {
      throw new PublisherError(
        'Attached media exceeds the email size limit. Please use smaller files or fewer attachments.',
        { code: 'INVALID_MEDIA', retryable: false },
      );
    }

    const finalFilename = uniqueFilename(filename, usedNames);
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    attachments.push({
      filename: finalFilename,
      mimeType,
      contentBase64,
      sizeBytes: buffer.length,
      isImage,
      isVideo,
      contentId: isImage ? `media-${idx + 1}` : null,
      publicUrl: isPublicExternalUrl(url) ? url : null,
    });
  }

  return { uniqueUrls, attachments };
}

function buildEmailBodies(bodyText, attachments) {
  const paragraphs = String(bodyText)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px 0;line-height:1.5;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('');

  const mediaBlocks = attachments.map((att) => {
    if (att.isImage) {
      return `<div style="margin-top:16px;"><img src="cid:${escapeHtml(att.contentId)}" alt="${escapeHtml(att.filename)}" style="display:block;max-width:100%;height:auto;border-radius:8px;" /></div>`;
    }
    const kindLabel = att.isVideo ? 'Attached video' : 'Attached file';
    const externalLink = att.publicUrl
      ? ` &mdash; <a href="${escapeHtml(att.publicUrl)}" target="_blank" rel="noreferrer">Open media link</a>`
      : '';
    return `<div style="margin-top:14px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:14px;"><strong>${kindLabel}:</strong> ${escapeHtml(att.filename)}${externalLink}</div>`;
  });

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;font-size:15px;">${paragraphs}${mediaBlocks.join('')}</div>`;

  const attachmentNotes = attachments
    .filter((att) => !att.isImage)
    .map((att) => {
      const label = att.isVideo ? 'Attached video' : 'Attached file';
      return att.publicUrl ? `${label}: ${att.filename} (${att.publicUrl})` : `${label}: ${att.filename}`;
    });
  const text = attachmentNotes.length > 0
    ? `${bodyText}\n\n${attachmentNotes.join('\n')}`
    : bodyText;

  return { text, html };
}

function extractEmailPayload(content, fallbackTitle = 'Campaign Update') {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return {
      subject: String(content.subject || fallbackTitle).trim(),
      body: String(content.body || content.text || '').trim(),
    };
  }
  const text = Array.isArray(content) ? content.join('\n\n') : String(content || '');
  return {
    subject: fallbackTitle,
    body: text.trim(),
  };
}

async function publish({ user, content, mediaUrls = [], title }) {
  const emailCfg = user?.socialAccounts?.email;
  if (!emailCfg?.isConnected || !emailCfg?.provider) {
    throw new PublisherError('Email provider is not connected.', { code: 'NOT_CONNECTED', retryable: false });
  }

  const secret = decryptSecret(emailCfg.secretEnc);
  const { subject, body } = extractEmailPayload(content, title || 'Market Aura Campaign');
  if (!subject || !body) {
    throw new PublisherError('Email subject and body cannot be empty.', { code: 'INVALID_CONTENT', retryable: false });
  }
  const recipients = Array.isArray(emailCfg.defaultRecipients) ? emailCfg.defaultRecipients.filter(Boolean) : [];
  if (recipients.length === 0) {
    throw new PublisherError('No recipient emails configured on email integration.', { code: 'INVALID_CONTENT', retryable: false });
  }

  if (!['resend', 'sendgrid', 'webhook'].includes(emailCfg.provider)) {
    throw new PublisherError('Unsupported email provider.', { code: 'INVALID_CONTENT', retryable: false });
  }
  if (emailCfg.provider === 'resend' && !secret) {
    throw new PublisherError('Resend API key missing.', { code: 'TOKEN_EXPIRED', retryable: false });
  }
  if (emailCfg.provider === 'sendgrid' && !secret) {
    throw new PublisherError('SendGrid API key missing.', { code: 'TOKEN_EXPIRED', retryable: false });
  }
  if (emailCfg.provider === 'webhook' && !emailCfg.webhookUrl) {
    throw new PublisherError('Email webhook URL missing.', { code: 'NOT_CONNECTED', retryable: false });
  }

  const { uniqueUrls, attachments } = await resolveEmailAttachments(mediaUrls, body, emailCfg.provider);
  const { text, html } = buildEmailBodies(body, attachments);
  const fromHeader = emailCfg.fromName ? `${emailCfg.fromName} <${emailCfg.fromEmail}>` : emailCfg.fromEmail;
  const timeoutMs = attachments.length > 0 ? 45000 : 20000;

  let res;
  try {
    if (emailCfg.provider === 'resend') {
      const resendPayload = {
        from: fromHeader,
        to: recipients,
        subject,
        text,
        html,
        ...(attachments.length > 0
          ? {
              attachments: attachments.map((att) => ({
                filename: att.filename,
                content: att.contentBase64,
                contentType: att.mimeType,
                ...(att.contentId ? { contentId: att.contentId } : {}),
              })),
            }
          : {}),
      };
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(resendPayload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } else if (emailCfg.provider === 'sendgrid') {
      const sendgridPayload = {
        personalizations: [{ to: recipients.map((email) => ({ email })) }],
        from: { email: emailCfg.fromEmail, ...(emailCfg.fromName ? { name: emailCfg.fromName } : {}) },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
        ...(attachments.length > 0
          ? {
              attachments: attachments.map((att) => ({
                content: att.contentBase64,
                filename: att.filename,
                type: att.mimeType,
                disposition: att.isImage ? 'inline' : 'attachment',
                ...(att.contentId ? { content_id: att.contentId } : {}),
              })),
            }
          : {}),
      };
      res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(sendgridPayload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } else {
      res = await fetch(emailCfg.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          from: fromHeader,
          to: recipients,
          subject,
          body: text,
          text,
          html,
          mediaUrls: uniqueUrls,
          attachments: attachments.map((att) => ({
            filename: att.filename,
            contentType: att.mimeType,
            content: att.contentBase64,
            sizeBytes: att.sizeBytes,
          })),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
  } catch (err) {
    if (err instanceof PublisherError) throw err;
    throw new PublisherError(`Email provider network error: ${err.message}`, { code: 'TRANSIENT_ERROR', retryable: true });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw classifyHttpError(res.status, data?.message || data?.errors?.[0]?.message || `Email API HTTP ${res.status}`);
  }

  return {
    externalPostId: data?.id || null,
    externalPostUrl: null,
  };
}

module.exports = { publish, extractEmailPayload, buildEmailBodies, resolveEmailAttachments };
