const { decryptSecret } = require('../../utils/tokenCrypto');
const { PublisherError, classifyHttpError } = require('./publisherErrors');

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

async function publish({ user, content, title }) {
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

  const fromHeader = emailCfg.fromName ? `${emailCfg.fromName} <${emailCfg.fromEmail}>` : emailCfg.fromEmail;

  let res;
  try {
    if (emailCfg.provider === 'resend') {
      if (!secret) throw new PublisherError('Resend API key missing.', { code: 'TOKEN_EXPIRED', retryable: false });
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromHeader, to: recipients, subject, text: body }),
        signal: AbortSignal.timeout(20000),
      });
    } else if (emailCfg.provider === 'sendgrid') {
      if (!secret) throw new PublisherError('SendGrid API key missing.', { code: 'TOKEN_EXPIRED', retryable: false });
      res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: recipients.map((email) => ({ email })) }],
          from: { email: emailCfg.fromEmail, ...(emailCfg.fromName ? { name: emailCfg.fromName } : {}) },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
        signal: AbortSignal.timeout(20000),
      });
    } else if (emailCfg.provider === 'webhook') {
      if (!emailCfg.webhookUrl) {
        throw new PublisherError('Email webhook URL missing.', { code: 'NOT_CONNECTED', retryable: false });
      }
      res = await fetch(emailCfg.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ from: fromHeader, to: recipients, subject, body }),
        signal: AbortSignal.timeout(20000),
      });
    } else {
      throw new PublisherError('Unsupported email provider.', { code: 'INVALID_CONTENT', retryable: false });
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

module.exports = { publish, extractEmailPayload };
