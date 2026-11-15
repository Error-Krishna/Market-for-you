# Market Aura 4U — REST API Reference

This document provides the definitive, complete API specification for Market Aura 4U. All routes, methods, headers, authentication gates, payload structures, query parameters, responses, and error codes are derived directly from the Express 5 router and controller implementations.

---

## 1. Global Conventions & Standards

- **Base URL (Local):** `http://localhost:8000/api/v1`
- **Base URL (Production):** `https://market-aura-api.onrender.com/api/v1`
- **Content-Type:** `application/json` (except static media endpoints)
- **Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`
- **Cookie Authentication:** The API also accepts an HTTP-only cookie named `token`.
- **Payload Limits:**
  - Standard JSON endpoints: `100kb`
  - Media upload endpoints (`/api/v1/media`): `15mb`
- **Standard Error Response Format:**
  ```json
  {
    "success": false,
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "Human readable error description."
  }
  ```

---

## 2. Health & Diagnostic Endpoints

### 2.1. Basic Health Check
Returns HTTP 200 indicating the Node.js Express process is running.

- **Route:** `GET /health`
- **Authentication:** None
- **Response:** `200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-16T03:30:00.000Z"
  }
  ```
> [!NOTE]
> `/health` does **not** test MongoDB connection readiness. It is designed for process keep-alives and load balancer pinging.

### 2.2. Service Readiness Check
Checks underlying database connectivity (`mongoose.connection.readyState === 1`).

- **Route:** `GET /ready`
- **Authentication:** None
- **Response (Ready):** `200 OK`
  ```json
  {
    "status": "ready"
  }
  ```
- **Response (Not Ready):** `503 Service Unavailable`
  ```json
  {
    "status": "not_ready",
    "dependencies": {
      "database": "unavailable"
    }
  }
  ```

---

## 3. Authentication & Account Management

### 3.1. User Registration
Registers a new user account with hashed password and initial monthly credits.

- **Route:** `POST /api/v1/auth/signup`
- **Authentication:** None (Rate limited by client IP)
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Constraints:**
  - `email`: Valid ASCII email, max 254 chars overall, max 64 in local part.
  - `password`: String with at least 8 JavaScript code units and at most 72 UTF-8 bytes (bcrypt limit).
- **Response:** `201 Created`
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "data": {
      "id": "6732f91a92e10a0012345678",
      "email": "user@example.com",
      "onboardingCompleted": false,
      "credits": { "monthly": 100, "used": 0 }
    }
  }
  ```
- **Errors:**
  - `400 Bad Request` (`INVALID_AUTH_INPUT`): Malformed JSON, extra fields, or invalid constraints.
  - `400 Bad Request`: User already exists.
  - `429 Too Many Requests`: IP or account registration rate limit exceeded.

### 3.2. User Login
Authenticates an existing user and returns a signed JWT.

- **Route:** `POST /api/v1/auth/login`
- **Authentication:** None (Rate limited by client IP and account)
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "message": "User logged in successfully",
    "status": 200,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "data": {
      "id": "6732f91a92e10a0012345678",
      "email": "user@example.com",
      "onboardingCompleted": true,
      "brandProfile": {
        "companyName": "Acme Inc",
        "industry": "SaaS",
        "uvp": "AI-driven customer workflows",
        "targetAudience": "B2B Marketing Leaders",
        "brandVoice": { "tone": "Professional" },
        "platforms": ["twitter", "linkedin", "instagram"]
      },
      "credits": { "monthly": 100, "used": 5 }
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Invalid credentials or malformed input.
  - `429 Too Many Requests`: Rate limit exceeded.

### 3.3. User Logout
Invalidates the session cookie.

- **Route:** `POST /api/v1/auth/logout`
- **Authentication:** None
- **Response:** `200 OK`
  ```json
  {
    "message": "User logged out successfully"
  }
  ```

### 3.4. Get User Profile
Retrieves the authenticated user's current profile, brand context, and credits.

- **Route:** `GET /api/v1/auth/profile`
- **Authentication:** Required (`Bearer <token>`)
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "user": {
      "id": "6732f91a92e10a0012345678",
      "email": "user@example.com",
      "name": "Jane Doe",
      "onboardingCompleted": true,
      "isPremium": false,
      "timezone": "UTC",
      "credits": { "monthly": 100, "used": 5 },
      "brandProfile": { ... }
    }
  }
  ```

### 3.5. Onboarding & Brand Profile Setup
Initializes brand profile fields. Unlocks protected workspace features.

- **Route:** `POST /api/v1/auth/onboarding`
- **Authentication:** Required (`Bearer <token>`)
- **Request Body:**
  ```json
  {
    "companyName": "Acme Marketing",
    "industry": "E-Commerce",
    "brandTone": "Bold & Persuasive",
    "uvp": "Automated cross-platform social campaigns in seconds.",
    "targetAudience": "E-commerce store owners and brand managers",
    "platforms": ["instagram", "twitter", "linkedin", "facebook"]
  }
  ```
- **Constraints:** All text fields must be nonblank strings, maximum 5000 UTF-16 code units. `platforms` must contain unique values from `['twitter', 'linkedin', 'instagram', 'facebook', 'email', 'blog']`.
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "message": "Onboarding completed successfully",
    "user": { ... }
  }
  ```

---

## 4. User Settings

### 4.1. Get User Settings
- **Route:** `GET /api/v1/settings`
- **Authentication:** Required
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "name": "Jane Doe",
      "email": "user@example.com",
      "timezone": "UTC",
      "settings": {
        "theme": "system",
        "notifications": { "emailAlerts": true, "weeklyDigest": false }
      },
      "brandProfile": { ... }
    }
  }
  ```

### 4.2. Update Profile & Preferences
- **Route:** `PUT /api/v1/settings/profile`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "name": "Jane Smith",
    "timezone": "America/New_York",
    "theme": "dark",
    "notifications": { "emailAlerts": true, "weeklyDigest": true }
  }
  ```
- **Response:** `200 OK`

### 4.3. Update Brand Profile
- **Route:** `PUT /api/v1/settings/brand`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "companyName": "Acme Global",
    "industry": "Marketing Tech",
    "uvp": "Smart multi-platform publishing",
    "targetAudience": "B2B Marketing Teams",
    "brandVoice": { "tone": "Inspirational", "description": "Engaging and clear" },
    "platforms": ["twitter", "linkedin", "instagram"]
  }
  ```
- **Response:** `200 OK`

### 4.4. Change Password
- **Route:** `POST /api/v1/settings/password/change`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword456!"
  }
  ```
- **Response:** `200 OK`

---

## 5. Social Media Accounts & Integrations

### 5.1. Get Connected Social Status
Returns connection and configuration status across all supported platforms.

- **Route:** `GET /api/v1/auth/social/status`
- **Authentication:** Required
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "status": {
      "timezone": "UTC",
      "platforms": {
        "twitter": { "isConnected": true, "serverConfigured": true, "username": "acme" },
        "linkedin": { "isConnected": true, "serverConfigured": true, "name": "Jane Doe" },
        "instagram": { "isConnected": true, "serverConfigured": true, "username": "acme_hq" },
        "facebook": { "isConnected": true, "serverConfigured": true, "pageName": "Acme Corp" },
        "email": { "isConnected": false, "serverConfigured": true },
        "blog": { "isConnected": false, "serverConfigured": true }
      }
    }
  }
  ```

### 5.2. List Multi-Tenant Social Accounts
- **Route:** `GET /api/v1/auth/social/accounts`
- **Authentication:** Required
- **Response:** `200 OK` (Returns array of `SocialAccount` items with tokens redacted).

### 5.3. Update Social Timezone
- **Route:** `PUT /api/v1/auth/social/timezone`
- **Authentication:** Required
- **Request Body:** `{ "timezone": "America/New_York" }`
- **Response:** `200 OK`

### 5.4. Twitter / X OAuth Flow
- **Initiate:** `GET /api/v1/auth/social/twitter/connect` (Auth required) -> Returns `{ success: true, url: "https://twitter.com/i/oauth2/authorize?..." }`
- **Callback:** `GET /api/v1/auth/social/twitter/callback?code=...&state=...` (Redirects to frontend `/social-accounts?connected=twitter`)

### 5.5. LinkedIn OAuth Flow
- **Initiate:** `GET /api/v1/auth/social/linkedin/connect` (Auth required) -> Returns `{ success: true, url: "https://www.linkedin.com/oauth/v2/authorization?..." }`
- **Callback:** `GET /api/v1/auth/social/linkedin/callback?code=...&state=...` (Redirects to frontend `/social-accounts?connected=linkedin`)

### 5.6. Instagram & Meta OAuth Flow
- **Initiate:** `GET /api/v1/auth/social/instagram/connect` (Auth required, alias: `/api/v1/auth/instagram/login`) -> Returns `{ success: true, url: "https://www.facebook.com/v21.0/dialog/oauth?..." }`
- **Callback:** `GET /api/v1/auth/social/instagram/callback?code=...&state=...` (alias: `/api/v1/auth/instagram/callback`) -> Redirects to frontend `/social-accounts?connected=instagram`

### 5.7. Facebook Page OAuth Flow
- **Initiate:** `GET /api/v1/auth/social/facebook/connect` (Auth required)
- **Callback:** `GET /api/v1/auth/social/facebook/callback`
- **Select Page:** `POST /api/v1/auth/social/facebook/select-page`
  - Body: `{ "pageId": "123456789" }`

### 5.8. Direct Integrations (Email & Blog)
- **Connect Email:** `POST /api/v1/auth/social/email/connect`
  - Body:
    ```json
    {
      "provider": "resend",
      "apiKey": "re_your_api_key",
      "fromEmail": "marketing@acme.com",
      "fromName": "Acme Marketing",
      "defaultRecipients": ["subscribers@acme.com"]
    }
    ```
- **Connect Blog:** `POST /api/v1/auth/social/blog/connect`
  - Body:
    ```json
    {
      "provider": "wordpress",
      "siteUrl": "https://blog.acme.com",
      "username": "editor_user",
      "applicationPassword": "xxxx xxxx xxxx xxxx"
    }
    ```

### 5.9. Disconnect Account
- **By Account ID:** `DELETE /api/v1/auth/social/accounts/:id`
- **By Platform:** `DELETE /api/v1/auth/social/:platform`

---

## 6. AI Content Generation & History

### 6.1. Generate Content
Executes ML recommendation lookup, generates tailored copy across all platforms via Groq Cloud LLM, stores the Job record, and debits 1 user credit.

- **Route:** `POST /api/v1/content/generate`
- **Authentication:** Required (`Bearer <token>`, must be onboarded)
- **Request Body:**
  ```json
  {
    "prompt": "Announce our Summer Flash Sale with 40% off all marketing automation tools."
  }
  ```
- **Constraints:** `prompt` must be a string, at least 5 characters after trimming, max 5000 characters.
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "message": "Content generated successfully!",
    "job": {
      "id": "6737c191a91e100012345679",
      "userId": "6732f91a92e10a0012345678",
      "status": "completed",
      "platforms": ["twitter", "linkedin", "instagram", "facebook", "email"],
      "originalContent": "Announce our Summer Flash Sale...",
      "generatedContent": {
        "twitter": [
          { "text": "Ready to supercharge your campaigns? ☀️ Our Summer Flash Sale is LIVE...", "image_url": "https://loremflickr.com/..." }
        ],
        "linkedin": [
          "Marketing leaders: Efficiency is the key differentiator in today's landscape..."
        ],
        "instagram": {
          "caption": "Summer is heating up, and so are your savings! Swipe through ☀️ 👉 #MarketingAutomation #FlashSale",
          "content_type": "carousel",
          "slides": [
            { "slide_number": 1, "headline": "Summer Flash Sale", "body": "40% off everything" },
            { "slide_number": 2, "headline": "What's Included", "body": "Full multi-platform suite" },
            { "slide_number": 3, "headline": "Limited Time", "body": "Link in bio to claim" }
          ],
          "image_url": "https://loremflickr.com/..."
        },
        "email": {
          "subject": "☀️ 40% Off Summer Flash Sale Starts Now!",
          "body": "Hi there,\n\nDon't miss our biggest sale of the season..."
        },
        "imageUrl": "https://loremflickr.com/1080/1080/Summer?random=1234"
      }
    }
  }
  ```
- **Errors:**
  - `400 Bad Request` (`INVALID_GENERATION_INPUT`): Prompt too short or too long.
  - `400 Bad Request` (`INVALID_BRAND_PROFILE`): Brand profile incomplete.
  - `402 Payment Required` (`INSUFFICIENT_CREDITS`): Monthly credits exhausted.
  - `429 Too Many Requests`: User already has a generation in progress or rate limit reached.

### 6.2. Publish Content Immediately (Direct Publishing)
- **Route:** `POST /api/v1/content/publish`
- **Authentication:** Required + Onboarded
- **Request Body:**
  ```json
  {
    "platform": "twitter",
    "content": { "text": "Exciting news! Our new feature has officially launched." },
    "mediaUrls": ["https://pub-xxx.r2.dev/media/user1/image.jpg"]
  }
  ```
- **Response:** `200 OK` `{ "success": true, "result": { "externalPostId": "18567...", "externalPostUrl": "https://x.com/..." } }`

### 6.3. Get Content Generation History
- **Route:** `GET /api/v1/content/history`
- **Authentication:** Required + Onboarded
- **Query Parameters:** `page` (default 1), `limit` (default 10)
- **Response:** `200 OK` `{ "success": true, "jobs": [...], "pagination": { ... } }`

---

## 7. Post Scheduling & Publishing Queue

### 7.1. Create Scheduled Post or Manual Broadcast
Schedules a post for future delivery, or enqueues a manual broadcast for immediate execution.

- **Route:** `POST /api/v1/posts`
- **Authentication:** Required + Onboarded
- **Request Body:**
  ```json
  {
    "title": "Summer Campaign Announcement",
    "sourceType": "ai_generated",
    "jobId": "6737c191a91e100012345679",
    "scheduledAt": "2026-11-20T14:00:00.000Z",
    "timezone": "UTC",
    "recommendedTimeUsed": true,
    "platforms": [
      {
        "platform": "twitter",
        "content": { "text": "Summer sale starts now! https://acme.com" },
        "mediaAssetIds": ["6738a12bcde00012345678ab"]
      },
      {
        "platform": "instagram",
        "content": {
          "caption": "Summer sale is LIVE! ☀️",
          "content_type": "image"
        },
        "mediaUrls": ["https://pub-xxx.r2.dev/media/user1/hero.jpg"]
      }
    ]
  }
  ```
- **Response:** `201 Created` `{ "success": true, "post": { ... } }`

### 7.2. List Scheduled Posts
- **Route:** `GET /api/v1/posts`
- **Authentication:** Required + Onboarded
- **Query Parameters:** `status` (e.g. `scheduled`, `published`, `failed`), `limit` (default 50)
- **Response:** `200 OK` `{ "success": true, "count": 12, "posts": [...] }`

### 7.3. Get Scheduled Post by ID
- **Route:** `GET /api/v1/posts/:id`
- **Authentication:** Required + Onboarded
- **Response:** `200 OK` `{ "success": true, "post": { ... } }`

### 7.4. Update Scheduled Post
- **Route:** `PUT /api/v1/posts/:id`
- **Authentication:** Required + Onboarded
- **Request Body:** `{ "title": "Updated Title", "scheduledAt": "2026-11-21T10:00:00.000Z" }`
- **Response:** `200 OK`

### 7.5. Publish Scheduled Post Immediately
- **Route:** `POST /api/v1/posts/:id/publish-now`
- **Authentication:** Required + Onboarded
- **Response:** `200 OK` `{ "success": true, "message": "Post delivery triggered", "post": { ... } }`
- **Errors:** `409 Conflict` if the post is currently locked by a scheduler worker.

### 7.6. Retry Failed Platforms
Retries delivery only for platforms whose status is `failed`.
- **Route:** `POST /api/v1/posts/:id/retry`
- **Authentication:** Required + Onboarded
- **Response:** `200 OK`

### 7.7. Resolve Unknown Delivery Outcome
Resolves uncertainty when a post was interrupted during external API communication.
- **Route:** `POST /api/v1/posts/:id/resolve-delivery`
- **Authentication:** Required + Onboarded
- **Request Body:**
  ```json
  {
    "platform": "instagram",
    "resolution": "published",
    "externalPostId": "17901234567"
  }
  ```
- **Resolution Options:** `"published"` or `"failed"`
- **Response:** `200 OK`

### 7.8. Cancel Scheduled Post
- **Route:** `POST /api/v1/posts/:id/cancel`
- **Authentication:** Required + Onboarded
- **Response:** `200 OK`

### 7.9. Delete Scheduled Post
- **Route:** `DELETE /api/v1/posts/:id`
- **Authentication:** Required + Onboarded
- **Response:** `200 OK`

---

## 8. Media Library Subsystem

### 8.1. List Media Assets
- **Route:** `GET /api/v1/media`
- **Authentication:** Required + Onboarded
- **Query Parameters:**
  - `mediaType`: Filter by `"image"` or `"video"`
  - `q`: Search string matching title, altText, or tags
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "count": 1,
    "media": [
      {
        "id": "6738a12bcde00012345678ab",
        "title": "Summer Campaign Hero",
        "altText": "Sun shining on marketing analytics dashboard",
        "tags": ["summer", "sale", "hero"],
        "mediaType": "image",
        "sourceType": "upload",
        "storageProvider": "r2",
        "url": "https://pub-xxx.r2.dev/media/user1/uuid.jpg",
        "mimeType": "image/jpeg",
        "sizeBytes": 204850,
        "createdAt": "2026-11-16T00:00:00.000Z"
      }
    ]
  }
  ```

### 8.2. Upload or Register Media Asset
Uploads a base64 encoded binary payload or registers an external public URL.

- **Route:** `POST /api/v1/media`
- **Authentication:** Required + Onboarded
- **Request Body (Base64 Upload):**
  ```json
  {
    "title": "Summer Campaign Hero",
    "altText": "Sun shining on dashboard",
    "tags": ["summer", "promo"],
    "dataBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "mimeType": "image/jpeg"
  }
  ```
- **Request Body (External URL):**
  ```json
  {
    "title": "Stock Promo Graphic",
    "url": "https://images.unsplash.com/photo-12345"
  }
  ```
- **Validation & Limits:**
  - File size: 1 byte to 10 MiB (`MEDIA_MAX_UPLOAD_BYTES`).
  - Supported types: JPEG, PNG, WebP, GIF, MP4 (verified by magic bytes).
  - Storage quota: 100 MiB per user (`MEDIA_USER_STORAGE_QUOTA_BYTES`).
  - Monthly operations: 100 uploads per calendar month (`MEDIA_USER_MONTHLY_UPLOAD_LIMIT`).
  - Duplicate upload check: Reuses existing asset if identical title, size, and MIME type exist.
- **Response:** `201 Created` (or `200 OK` if duplicate reused).

### 8.3. Update Media Asset Metadata
- **Route:** `PUT /api/v1/media/:id`
- **Authentication:** Required + Onboarded
- **Request Body:** `{ "title": "New Title", "altText": "Updated alt text", "tags": ["tag1", "tag2"] }`
- **Response:** `200 OK`

### 8.4. Delete Media Asset
Deletes metadata from MongoDB and purges binary object from Cloudflare R2 / filesystem.

- **Route:** `DELETE /api/v1/media/:id`
- **Authentication:** Required + Onboarded
- **Protection:** Returns `409 Conflict` if the asset is currently referenced by any post with status `scheduled` or `processing`.
- **Response:** `200 OK` `{ "success": true, "message": "Media asset deleted" }`

### 8.5. Serve Local Uploaded Media
Serves locally uploaded media files when `MEDIA_STORAGE_PROVIDER=local`.

- **Route:** `GET /uploads/media/:userId/:filename`
- **Authentication:** None (Public)
- **Headers:** `Cross-Origin-Resource-Policy: cross-origin`, `Cache-Control: public, max-age=31536000, immutable`

---

## 9. Payments & Subscriptions (Razorpay)

> [!NOTE]
> All payment endpoints are gated by `disabledFeaturesRouter`. If `CHECKOUT_ENABLED !== 'true'`, routes return HTTP 403 `FEATURE_DISABLED`.

### 9.1. Get Available Subscription Plans
- **Route:** `GET /api/v1/payments/plans` (aliases: `/api/v1/user/plans`, `/api/v1/billing/plans`)
- **Authentication:** None
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "starter",
        "name": "Starter Plan",
        "monthlyCredits": 500,
        "priceINR": 499,
        "currency": "INR",
        "features": [...]
      },
      {
        "id": "pro",
        "name": "Pro Plan",
        "monthlyCredits": 2500,
        "priceINR": 1499,
        "currency": "INR",
        "popular": true,
        "features": [...]
      },
      {
        "id": "enterprise",
        "name": "Enterprise Plan",
        "monthlyCredits": 10000,
        "priceINR": 4999,
        "currency": "INR",
        "features": [...]
      }
    ]
  }
  ```

### 9.2. Get User Subscription Status
- **Route:** `GET /api/v1/payments/subscription` (aliases: `/api/v1/user/subscription`)
- **Authentication:** Required
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "status": "free",
      "plan": "starter",
      "credits": { "monthly": 100, "used": 5, "remaining": 95 },
      "isPremium": false
    }
  }
  ```

### 9.3. Create Razorpay Order
- **Route:** `POST /api/v1/payments/create-order` (aliases: `/api/v1/user/payment/create-order`)
- **Authentication:** Required
- **Request Body:** `{ "planId": "pro" }`
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "orderId": "order_EKfwwad3431a",
    "amount": 149900,
    "currency": "INR",
    "keyId": "rzp_test_..."
  }
  ```

### 9.4. Verify Payment Signature
Validates Razorpay payment signature using constant-time HMAC SHA256 comparison and credits the user account.

- **Route:** `POST /api/v1/payments/verify` (aliases: `/api/v1/user/payment/verify`)
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "orderCreationId": "order_EKfwwad3431a",
    "razorpayPaymentId": "pay_29QQoUBi66xm2f",
    "razorpayOrderId": "order_EKfwwad3431a",
    "razorpaySignature": "9ef4b6fa0...hmac_hex",
    "planId": "pro"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "message": "Payment verified successfully",
    "credits": 2500,
    "subscription": { "plan": "pro", "status": "active" }
  }
  ```

---

## 10. Background Scheduler Runner

### 10.1. Execute Scheduled Post Poll
Invokes the background batch processor to claim and execute due posts. Designed for external uptime monitors and cron jobs.

- **Route:** `ALL /api/v1/scheduler/run`
- **Authentication:** Requires `CRON_SECRET` via `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "message": "Processed 2 due post(s).",
    "processedCount": 2,
    "timestamp": "2026-11-16T03:30:00.000Z"
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Token missing or mismatch.
  - `403 Forbidden`: `CRON_SECRET` is unconfigured on production server.
