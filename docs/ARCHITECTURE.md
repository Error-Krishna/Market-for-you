# Market Aura 4U — System Architecture Specification

This document provides software architects and engineers with a comprehensive, technically accurate architectural description of **Market Aura 4U**. It details the component boundaries, runtime topologies, data flows, persistence models, and security boundaries across the entire system.

---

## 1. Architectural Principles & Overview

Market Aura 4U is an enterprise-grade digital marketing automation platform combining:
1. **Brand-Grounded AI Generation:** Combines brand persona intelligence (industry, UVP, target audience, voice, tone) with Groq LLM inference (`openai/gpt-oss-20b`) to produce tailor-made copy for multiple marketing channels in one atomic operation.
2. **ML Recommender Advisory:** A Python 3.11 machine learning microservice (`CAPSTONE`) utilizing sentence transformers (`all-MiniLM-L6-v2`) to recommend optimal content formats (e.g. multi-slide carousels vs single images), predicted engagement rates, topic angles, and optimal posting windows.
3. **Multi-Platform Publishing & Scheduling Engine:** Direct publishing and background-scheduled distribution across Instagram, Facebook Pages, Twitter/X, LinkedIn, Email newsletters (Resend, SendGrid, Webhook), and Blog CMSs (WordPress, Ghost, Hashnode, Webhook).
4. **Resilient Durable Scheduler:** An in-process MongoDB-backed scheduler enforcing atomic distributed leases, preventing duplicate posts upon worker crashes, and isolating provider failures.
5. **Decoupled Cloud Topology:** Frontend Single-Page Application (SPA) on Vercel's global Edge CDN, Node.js Express 5 REST API on Render, MongoDB Atlas for durable document storage, and Cloudflare R2 for zero-egress public media asset hosting.

---

## 2. High-Level System Architecture

The following diagram illustrates the interconnected services, network protocols, external integrations, and cloud hosting infrastructure:

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser / Mobile)"]
        Browser["React 19 / Vite SPA\n(https://market-for-you-two.vercel.app)"]
    end

    subgraph CDN["Edge & CDN Infrastructure"]
        VercelCDN["Vercel Global Edge Network\n(Static Asset Caching & SPA Routing)"]
        CloudflareCDN["Cloudflare R2 Public CDN / Domain\n(Public Media Delivery)"]
    end

    subgraph BackendCluster["Compute Services (Render Cloud)"]
        API["Express 5 Node.js 22 LTS API\n(https://market-aura-api.onrender.com)"]
        Scheduler["In-Process Durable Scheduler\n(15s Polling Loop & Atomic Claims)"]
        CronRunner["Protected Cron Endpoint\n(/api/v1/scheduler/run)"]
        MLService["Python 3.11 ML Recommender\n(Port 8080 / Docker)"]
    end

    subgraph Persistence["Database & Storage"]
        MongoAtlas[("MongoDB Atlas 7\n(Replica Set / Mongoose 8)")]
        R2Bucket[("Cloudflare R2 Bucket\n(market-aura-media-prod)")]
    end

    subgraph ExternalProviders["External APIs & AI Services"]
        GroqAPI["Groq Cloud LLM\n(openai/gpt-oss-20b)"]
        MetaGraph["Meta Graph API v21.0\n(Instagram & Facebook)"]
        TwitterAPI["Twitter / X API v2\n(OAuth 2.0 PKCE)"]
        LinkedInAPI["LinkedIn REST API\n(Community Management)"]
        RazorpayGateway["Razorpay Payments\n(Orders & Webhook Verification)"]
    end

    Browser -->|"HTTPS Fetch (Static HTML/JS)"| VercelCDN
    Browser -->|"HTTPS REST API / JSON + JWT"| API
    Browser -->|"Public Media Stream"| CloudflareCDN
    CloudflareCDN -->|"S3 Object Read"| R2Bucket

    API -->|"SCRAM-SHA-256 / Mongoose"| MongoAtlas
    API -->|"AWS SDK v3 (PutObject/DeleteObject)"| R2Bucket
    API -->|"Internal HTTP / Loopback"| MLService
    API -->|"HTTPS Chat Completions (JSON Mode)"| GroqAPI
    API -->|"HTTPS API / HMAC SHA256"| RazorpayGateway
    API -->|"OAuth 2.0 & Publishing"| TwitterAPI
    API -->|"OAuth 2.0 & REST Posts"| LinkedInAPI
    API -->|"OAuth 2.0 & Graph API"| MetaGraph

    Scheduler -->|"Atomic Claim (findOneAndUpdate)"| MongoAtlas
    Scheduler -->|"Publish Due Posts"| MetaGraph
    Scheduler -->|"Publish Due Posts"| TwitterAPI
    Scheduler -->|"Publish Due Posts"| LinkedInAPI

    CronRunner -.->|"Trigger Poll (CRON_SECRET)"| Scheduler
    MetaGraph -->|"Fetch Media URL"| CloudflareCDN
```

---

## 3. Subsystem Breakdown

### 3.1. Frontend Architecture (`market-aura-4u-frontend-main/`)

- **Framework:** React 19 (`19.2.8`) using TypeScript (`~6.0.2` / 5.x) and Vite (`8.2.2`).
- **Styling:** Tailwind CSS v4 (`4.3.3`) utilizing `@tailwindcss/vite` and design tokens defined in `src/styles/tokens.css`.
- **Routing:** React Router v7 (`7.18.3`) in declarative browser router mode with layout wrappers:
  - `PublicRoute` / `PublicLayout`: Landing page (`/`), error pages.
  - `AuthRoute` / `AuthLayout`: Login (`/login`), Signup (`/signup`).
  - `ProtectedRoute` / `OnboardingRoute`: Guards access to `/onboarding`. Forces un-onboarded users through onboarding before allowing dashboard access; redirects onboarded users directly to the dashboard.
  - `AppLayout`: Side navigation (`Sidebar.tsx`), global header (`Topbar.tsx`), notifications, and active session wrapper for all authenticated views (`/dashboard`, `/content/create`, `/content/history`, `/posts/scheduled`, `/media`, `/billing`, `/social-accounts`, `/settings`).
- **Server State & Data Fetching:** TanStack React Query v5 (`5.102.8`) with automatic caching, background revalidation, and optimistic updates.
- **Form Management & Validation:** React Hook Form (`7.87.0`) paired with Zod (`4.5.4`) schemas (`@hookform/resolvers`).
- **HTTP Client:** Axios (`1.20.0`) configured with:
  - Dynamic base URL normalization (`normalizeApiBaseUrl` in `src/app/config/env.ts`).
  - Request interceptor attaching `Authorization: Bearer <token>` from `localStorage` (`market-aura-auth-token`).
  - Response interceptor automatically clearing credentials on HTTP 401.
  - `withCredentials: true` to support HTTP-only session cookies.

### 3.2. Backend API Architecture (`market-aura-4u-backend-main/`)

- **Runtime:** Node.js 22 LTS (`22.23.5`), Express 5 (`5.1.0`).
- **Database Driver:** Mongoose 8 (`8.19.2`) with connection pool tuning (`maxPoolSize: 20` for long-running services, `10` for serverless, `serverSelectionTimeoutMS: 5000`).
- **Layered Architecture:**
  - `src/app.js`: Express application setup, security middleware, body parsers (100kb default, 15mb for `/api/v1/media`), health check routes (`/health`, `/ready`), graceful shutdown listeners (`SIGINT`, `SIGTERM`), and scheduler bootstrapper.
  - `src/routes/`: Versioned routing mounted at `/api/v1`. Includes `authRouter`, `socialRouter`, `contentRouter`, `postsRouter`, `mediaRouter`, `schedulerRouter`, `paymentRouter`, `settingsRouter`, and `disabledFeaturesRouter`.
  - `src/controllers/`: Business logic handlers for user authentication, onboarding, content generation, post publishing, media library operations, and payment webhooks.
  - `src/models/`: Mongoose schemas with compound indexes, TTL expiration indexes, field projections, and optimistic concurrency controls.
  - `src/middleware/`: Authentication validation (`auth.js`), onboarding gatekeeper (`isOnboarded.js`), IP and account rate limiters (`authAttempts.js`), strict CORS enforcement (`cors.js`).
  - `src/services/`: Modular service layer containing per-platform publishers (`publishers/`), background scheduling service (`schedulerService.js`), and storage abstraction (`storage/`).
  - `src/utils/`: AES-256-GCM token cryptography (`tokenCrypto.js`), SSRF validation, diagnostic collectors, and recommender client wrappers.

### 3.3. Machine Learning Recommender Service (`CAPSTONE/`)

- **Runtime:** Python 3.11 with custom HTTP server (`src/serve.py`) and pipeline orchestrator (`src/pipeline.py`).
- **Models & Libraries:** `sentence-transformers` (`all-MiniLM-L6-v2`), `scikit-learn`, `numpy`, `pandas`.
- **Capabilities:**
  1. Computes dense semantic embeddings of company descriptions and UVPs.
  2. Recommends data-backed content formats (e.g. `carousel`, `image`, `video`).
  3. Predicts engagement scores (expected engagement rate and percentile).
  4. Suggests optimal posting time windows based on historical performance distributions.
  5. Suggests relevant trending topic hooks.
- **Contract Schemas:** Strictly validated via JSON Schema contracts:
  - Input: `CAPSTONE/contract/input_schema.json`
  - Output: `CAPSTONE/contract/output_schema.json`
- **Graceful Fallback Design:**
  - When deployed on platforms with memory constraints (such as Render Free tier 512MiB), the Express backend automatically detects unconfigured or non-responsive recommender endpoints.
  - Content generation degrades gracefully without blocking: the LLM receives fallback advisory signals or generates directly from user brand intelligence, ensuring zero application downtime.
- **Authentication Modes:**
  - `none`: Permitted exclusively for local loopback development (`127.0.0.1`, `localhost`, or internal Docker network hostnames `ml-recommender`, `market-aura-ml`).
  - `cloud-run`: For remote Google Cloud Run deployments, the Node.js backend obtains an OIDC identity token from the GCP metadata server and signs outgoing HTTP requests.

---

## 4. End-to-End Architectural Flows

### 4.1. Authentication & Onboarding Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant FE as React Frontend
    participant API as Express API
    participant DB as MongoDB Atlas

    User->>FE: Enters email and password on /signup
    FE->>API: POST /api/v1/auth/signup {email, password}
    Note over API: Rate limiter verifies source IP & account budget
    API->>API: bcrypt.hash(password, 10)
    API->>DB: User.create({email, passwordHash, onboardingCompleted: false})
    API->>API: Sign JWT (24h expiry)
    API-->>FE: HTTP 201 {token, user} + Set-Cookie: token (httpOnly)
    FE->>FE: Store token in localStorage
    FE->>FE: Redirect to /onboarding (ProtectedRoute detects onboardingCompleted: false)

    User->>FE: Completes onboarding form (Company, UVP, Voice, Platforms)
    FE->>API: POST /api/v1/auth/onboarding (Bearer JWT)
    Note over API: auth middleware verifies JWT signature & user existence
    API->>API: Validate brand profile constraints (max 5000 chars/field)
    API->>DB: User.updateOne({_id: userId}, {brandProfile, onboardingCompleted: true})
    API-->>FE: HTTP 200 {success: true, user}
    FE->>FE: Redirect to /dashboard
```

### 4.2. Social Media OAuth Integration Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant FE as React Frontend
    participant API as Express API
    participant DB as MongoDB Atlas
    participant Meta as Meta / Social Provider

    User->>FE: Clicks "Connect Instagram" on /social-accounts
    FE->>API: GET /api/v1/auth/social/instagram/connect (Bearer JWT)
    API->>API: Generate 24-byte cryptographically secure state token
    API->>DB: OAuthState.create({state, userId, platform: 'instagram', expiresAt: +10m})
    API-->>FE: HTTP 200 {url: "https://www.facebook.com/v21.0/dialog/oauth?..."}
    FE->>Meta: Browser redirects to Meta OAuth dialog

    User->>Meta: Grants permissions (Pages, Instagram Professional)
    Meta->>API: GET /api/v1/auth/social/instagram/callback?code=CODE&state=STATE
    API->>DB: OAuthState.findOneAndDelete({state, platform: 'instagram'})
    Note over API: Atomically consumes state to prevent replay attacks
    API->>Meta: Exchange code for long-lived access token
    Meta-->>API: Returns {access_token, expires_in}
    API->>Meta: Discovers connected Instagram accounts (/me/assigned_instagram_accounts)
    API->>API: Encrypt access token with AES-256-GCM (random 12-byte IV + auth tag)
    API->>DB: Upsert SocialAccount({userId, provider: 'instagram', encryptedAccessToken, ...})
    API->>DB: Update User.socialAccounts.instagram.isConnected = true
    API-->>User: HTTP 302 Redirect to ${FRONTEND_URL}/social-accounts?connected=instagram
    User->>FE: Browser loads /social-accounts and refreshes connected status
```

### 4.3. Brand-Grounded AI Generation Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Marketer
    participant FE as React Frontend
    participant API as Express API
    participant ML as Python ML Recommender
    participant Groq as Groq Cloud API
    participant DB as MongoDB Atlas

    User->>FE: Enters topic/prompt on /content/create
    FE->>API: POST /api/v1/content/generate {prompt} (Bearer JWT)
    Note over API: Check auth, isOnboarded, user credits (debit 1 on success)
    Note over API: Acquire generation concurrency & rate reservation

    API->>ML: POST /recommend {brand_name, uvp, industry, target_audience}
    alt ML Service Available
        ML-->>API: Returns {recommended_format: "carousel", optimal_time, engagement}
    else ML Service Timeout / Offline
        Note over API: Gracefully degrade: continue with default format heuristics
    end

    API->>DB: Job.create({userId, platforms, status: 'processing', prompt})
    API->>API: Assemble system prompt with Brand Intelligence + ML Signals
    API->>Groq: POST /chat/completions (model: openai/gpt-oss-20b, response_format: json_object)
    Groq-->>API: Returns structured multi-platform JSON copy
    API->>API: validateAndNormalizeContent (enforce tweet lengths, slide counts, email schema)
    API->>API: Generate contextual LoremFlickr image preview URL
    API->>DB: Job.findByIdAndUpdate(jobId, {status: 'completed', generatedContent})
    API->>DB: Decrement user credit balance (User.credits.used += 1)
    API-->>FE: HTTP 200 {success: true, job}
    FE-->>User: Displays platform cards (Instagram Carousel slides, X, LinkedIn, Email)
```

### 4.4. Media Upload, Storage & Delivery Subsystem

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Marketer
    participant FE as React Frontend
    participant API as Express API
    participant DB as MongoDB Atlas
    participant R2 as Cloudflare R2 Bucket
    participant Meta as Meta Graph API

    User->>FE: Selects local file (Image/Video) in MediaPickerModal
    FE->>FE: Reads file as Base64 data URL
    FE->>API: POST /api/v1/media {title, dataBase64, mimeType}
    Note over API: Verify auth, check monthly limit (100) & quota (100MB)
    Note over API: Validate magic bytes (JPEG/PNG/GIF/WebP/MP4) & size <= 10MB
    Note over API: Deduplication check (reuse existing asset if identical title/size/mime)

    alt Cloudflare R2 Configured (MEDIA_STORAGE_PROVIDER=r2)
        API->>API: Build key: media/{userId}/{uuid}.{ext}
        API->>R2: PutObjectCommand({Bucket, Key, Body: buffer, ContentType})
        R2-->>API: PutObject success (HTTP 200)
        API->>API: Formulate URL: https://{R2_PUBLIC_BASE_URL}/{key}
    else Local Fallback (MEDIA_STORAGE_PROVIDER=local)
        API->>API: Write buffer to filesystem: uploads/media/{userId}/{uuid}.{ext}
        API->>API: Formulate URL: http://{host}/uploads/media/{userId}/{filename}
    end

    API->>DB: MediaAsset.create({userId, title, mediaType, url, storageKey, sizeBytes})
    API-->>FE: HTTP 201 {success: true, media: MediaAsset}

    Note over API,Meta: Subsequent Automated Post Publishing
    API->>Meta: POST /v21.0/{ig_id}/media {image_url: R2_PUBLIC_URL}
    Meta->>R2: Anonymous HTTP GET to public R2 URL
    R2-->>Meta: Returns 200 OK with binary image stream
    Meta-->>API: Returns container ID
    API->>Meta: POST /v21.0/{ig_id}/media_publish {creation_id}
    Meta-->>API: Returns published post ID
```

---

## 5. Durable Background Scheduling Architecture

The post scheduling engine executes automated distribution across connected platforms while preventing race conditions, dual-posting, and worker crashes.

### 5.1. Scheduling Principles
1. **Durable Claims:** Uses MongoDB `findOneAndUpdate` with optimistic locking (`__v`) and distributed worker leases (`lockedBy`, `lockUntil`).
2. **Polling Worker:** An in-process polling loop runs every 15 seconds (`setInterval`) in the Express process.
3. **External Cron Trigger:** Exposes `ALL /api/v1/scheduler/run` requiring `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>` to allow external uptime monitors (cron-job.org, GitHub Actions, Cloudflare Workers) to trigger runs even if serverless or sleeping.
4. **Delivery Outcome Uncertainty Protection:** If a worker crashes or network times out while calling an external platform, the outcome is marked as unknown (`deliveryOutcomeUnknown: true`). The post is moved to `failed` and flagged for manual review rather than blindly retried, preventing duplicate customer broadcasts.

### 5.2. Post State Machine

```mermaid
stateDiagram-v2
    [*] --> Scheduled: User schedules post (future timestamp)
    [*] --> Processing: User selects "Publish Now" or manual broadcast

    Scheduled --> Processing: Scheduler claims post (scheduledAt <= now, lock acquired)
    Processing --> Published: All platform targets succeed
    Processing --> Partial: Some platforms succeed, others fail
    Processing --> Failed: All platform targets fail

    Processing --> OutcomeUnknown: Network timeout / Worker interrupted during HTTP call
    OutcomeUnknown --> Failed: Flagged deliveryOutcomeUnknown=true (Requires review)

    Failed --> Processing: User reviews and triggers "Retry Failed"
    Failed --> Cancelled: User cancels failed post
    Scheduled --> Cancelled: User cancels before scheduledAt

    Published --> [*]
    Cancelled --> [*]
```

---

## 6. Payment & Subscription Architecture

- **Payment Gateway:** Razorpay API (`razorpay` npm package).
- **Control Gate:** The `disabledFeaturesRouter` middleware checks `CHECKOUT_ENABLED === 'true'`. If disabled, billing routes return HTTP 403 `FEATURE_DISABLED`.
- **Tiers & Credits:**
  - **Starter:** ₹499/month, 500 generation credits.
  - **Pro:** ₹1,499/month, 2,500 generation credits.
  - **Enterprise:** ₹4,999/month, 10,000 generation credits.
- **Verification Security:**
  - Order creation occurs exclusively on the backend (`POST /api/v1/payments/create-order`).
  - Payment signature verification (`POST /api/v1/payments/verify`) computes the expected HMAC SHA256 of `order_id + '|' + payment_id` using `RAZORPAY_KEY_SECRET` and executes a constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
  - Transaction reuse protection: Checks for prior transactions with the same payment ID to prevent double-crediting.
