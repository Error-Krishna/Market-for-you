# Market Aura 4U — Third-Party Integrations Guide

This document provides a comprehensive technical reference for all third-party APIs, SDKs, and external services integrated into **Market Aura 4U**. It details authentication mechanisms, API workflows, configuration requirements, and operational constraints for each provider.

---

## 1. Integrations Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MARKET AURA 4U BACKEND                          │
└────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───┘
         │           │           │           │           │           │
         ▼           ▼           ▼           ▼           ▼           ▼
      ┌──────┐    ┌─────┐    ┌────────┐   ┌──────┐    ┌──────┐   ┌───────┐
      │ Meta │    │  X  │    │LinkedIn│   │ Groq │    │  R2  │   │Razor- │
      │Graph │    │ API │    │  REST  │   │  AI  │    │ S3   │   │  pay  │
      └──────┘    └─────┘    └────────┘   └──────┘    └──────┘   └───────┘
```

| Integration | Primary Purpose | Integration Mechanism | Key Environment Variables |
|---|---|---|---|
| **Meta (Instagram & FB)**| Instagram Business publishing & Facebook Pages | Meta Graph API v21.0 & OAuth Unified Login | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `META_UNIFIED_CONFIG_ID` |
| **Twitter / X** | Automated tweets and media threads | Twitter API v2 (OAuth 2.0 PKCE) | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` |
| **LinkedIn** | Professional posts & image publishing | LinkedIn Community Management REST API | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| **Groq Cloud** | Fast LLM copywriting & hashtag generation | OpenAI-compatible Chat Completions API | `GROQ_API_KEY`, `GROQ_MODEL` |
| **Cloudflare R2** | Zero-egress media storage for social delivery | AWS SDK v3 (`@aws-sdk/client-s3`) | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL` |
| **Razorpay** | Subscription plans & credit top-ups | Razorpay Node SDK & HMAC SHA256 verification | `CHECKOUT_ENABLED`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| **Email Providers** | Newsletter broadcasts | Resend / SendGrid / Custom Webhooks | Configured per user via encrypted vault |
| **Blog CMS** | Long-form article publishing | WordPress REST API / Ghost / Hashnode / Webhooks | Configured per user via encrypted vault |

---

## 2. Meta (Instagram & Facebook) Integration

Market Aura 4U integrates with Meta to publish content to **Instagram Professional Accounts** (Business or Creator) and **Facebook Pages**.

### 2.1. Meta Unified Login
The application uses Meta's Unified Configuration flow:
- In production, `META_UNIFIED_CONFIG_ID` is strictly required. The authorization URL appends `&config_id=${META_UNIFIED_CONFIG_ID}` instead of flat scopes.
- This requests unified permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
- In development/fallback mode, explicit scopes are passed if `META_UNIFIED_CONFIG_ID` is omitted.

### 2.2. Instagram Account Discovery Routine
Upon receiving the OAuth authorization code, the backend invokes a multi-tier account discovery routine to handle both System User Access Tokens (SUAT) and standard user tokens:
1. **Method 1 (`/me/assigned_instagram_accounts`):** Standard for Business Integration Unified Login SUAT tokens.
2. **Method 2 (`/me/accounts` with `instagram_business_account` expansion):** Discovers Instagram accounts linked through Facebook Pages.
3. **Method 3 (`/me` with Instagram User ID):** Direct fallback for Instagram Basic Display.

### 2.3. Instagram Publishing Workflow
Instagram Graph API requires a two-step containerized publishing flow:
1. **Step 1: Container Creation (`POST /v21.0/{ig_id}/media`)**
   - For single images: `{ image_url, caption }`
   - For reels/videos: `{ media_type: "REELS", video_url, caption }`
   - For carousels: First creates child item containers for each slide, then creates a parent container with `{ media_type: "CAROUSEL", children: [id1, id2, ...] }`.
2. **Step 2: Status Polling**
   - Polls `GET /v21.0/{container_id}?fields=status_code` every 2 seconds until `FINISHED` (timeout: 45s for images, 90s for video).
3. **Step 3: Publish Container (`POST /v21.0/{ig_id}/media_publish`)**
   - Passes `{ creation_id: container_id }` to trigger publication on the live feed.

> [!CRITICAL]
> **Media Reachability:** Meta's servers download media files directly from the provided URL. Local upload URLs (`http://localhost...` or `/uploads/media/...`) **cannot** be ingested by Meta. Media assets must be hosted on Cloudflare R2 with a public HTTPS URL (`R2_PUBLIC_BASE_URL`).

---

## 3. Twitter / X API v2 Integration

- **Authentication:** OAuth 2.0 Authorization Code with PKCE (`code_challenge` / `code_verifier`).
- **SDK:** `twitter-api-v2` (`^1.27.0`).
- **Token Management:**
  - Access tokens and refresh tokens are encrypted at rest with AES-256-GCM.
  - The publisher automatically checks token expiration before delivery. If a token expires within 5 minutes, it refreshes the token automatically via `TwitterApi.refreshOAuth2Token(refreshToken)`.
- **Publishing API:**
  - Text tweets: `POST https://api.twitter.com/2/tweets` with `{ text }`.
  - Image attachments: Media is uploaded via chunked upload (`POST https://upload.twitter.com/1.1/media/upload.json`), and the resulting `media_id` is attached to the tweet payload.
- **Constraints:** Enforces Twitter's 280-character limit during both AI generation and manual broadcast creation.

---

## 4. LinkedIn Integration

- **Authentication:** OAuth 2.0 with scopes `openid profile email w_member_social`.
- **API Versions:** Uses LinkedIn Community Management REST API with headers:
  - `LinkedIn-Version: 202501`
  - `X-Restli-Protocol-Version: 2.0.0`
- **Publishing Workflow:**
  1. **Text Posts:** `POST https://api.linkedin.com/rest/posts` with `{ author: memberUrn, commentary, visibility: "PUBLIC", distribution: { ... } }`.
  2. **Image Posts:**
     - Initialize upload: `POST /rest/images?action=initializeUpload` with `{ initializeUploadRequest: { owner: memberUrn } }`.
     - Upload binary data: `PUT` binary image buffer to the returned `uploadUrl`.
     - Finalize post: Pass the returned `imageUrn` inside the `content.media.id` field of `POST /rest/posts`.

---

## 5. Groq Cloud AI Integration

- **Model:** `openai/gpt-oss-20b` (configurable via `GROQ_MODEL`).
- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions`.
- **Structured JSON Mode:** Outgoing requests set `response_format: { type: "json_object" }` to ensure deterministic, parseable JSON responses.
- **Brand Context Grounding:** Assembles a multi-section prompt containing:
  - Section 1: Brand Intelligence (Industry, Target Audience, UVP, Brand Voice & Tone).
  - Section 1.5: ML Signals (Optimal format, recommended posting window, predicted engagement).
  - Section 2: User Prompt / Campaign brief.
  - Section 3: Strict JSON output rules tailored for requested platforms.
- **Validation Engine:** The response is cleaned and passed through `validateAndNormalizeContent()` in `generateContent.js`, validating character counts for tweets, carousel slide structures, and email subject/body pairs.

---

## 6. Cloudflare R2 Object Storage Integration

- **API Compatibility:** AWS S3 compatible using `@aws-sdk/client-s3` v3 (`^3.1169.0`).
- **Endpoint Sanitization:** `sanitizeR2Endpoint()` automatically strips path suffixes from custom endpoints, ensuring stable connectivity to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
- **Operations Implemented:**
  - `PutObjectCommand`: Streams media buffers to `media/{userId}/{uuid}.{ext}` with declared content types.
  - `DeleteObjectCommand`: Purges media files when assets are deleted by the user.
- **Zero Egress Advantage:** Bandwidth fees for downloading media by end users and Meta crawlers are \$0.

---

## 7. Razorpay Payments Integration

- **SDK:** `razorpay` (`^2.9.6`).
- **Order Lifecycle:**
  1. Frontend requests order creation: `POST /api/v1/payments/create-order` with `{ planId }`.
  2. Backend looks up plan pricing in paise (`pricePaise`) from the static `PLANS` dictionary and calls `razorpay.orders.create()`.
  3. Frontend opens the Razorpay Checkout modal with the returned `orderId`.
  4. Upon payment completion, the frontend submits the payment signature to `POST /api/v1/payments/verify`.
  5. The backend generates expected HMAC SHA256: `crypto.createHmac('sha256', secret).update(order_id + '|' + payment_id).digest('hex')` and validates it using `crypto.timingSafeEqual()`.
  6. On successful verification, the user's credits are incremented and subscription status is updated to `active`.

---

## 8. Direct Channels (Email & Blog)

### 8.1. Email Newsletters
- **Supported Providers:** Resend, SendGrid, and Generic Webhook.
- **Credential Storage:** Stored in `User.socialAccounts.email` with API keys encrypted via `encryptSecret()`.
- **Attachment Processing:**
  - Files are loaded via `loadMediaBuffer()`.
  - Disambiguates duplicate file names.
  - Enforces provider payload limits (Resend: 38MB, SendGrid: 28MB).
- **Execution:** Sends HTML-formatted messages with embedded image tags or native attachments.

### 8.2. Blog Publishing
- **Supported Providers:** WordPress (WP REST API `/wp-json/wp/v2/posts`), Ghost, Hashnode, Generic Webhook.
- **Authentication:** WordPress application passwords encoded as HTTP Basic Auth (`username:password`).
- **Formatting:** Extracts article title from the first heading line or frontmatter and formats Markdown/HTML body.
