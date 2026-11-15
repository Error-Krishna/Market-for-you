# Market Aura 4U — Digital Marketing & Multi-Platform Publishing Studio

[![CI Pipeline](https://github.com/Error-Krishna/Market-for-you/actions/workflows/ci.yml/badge.svg)](https://github.com/Error-Krishna/Market-for-you/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-22.23.5_LTS-339933?logo=node.js&logoColor=white)](.node-version)
[![React Version](https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=black)](market-aura-4u-frontend-main/package.json)
[![Express Version](https://img.shields.io/badge/Express-5.1.0-000000?logo=express&logoColor=white)](market-aura-4u-backend-main/package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%2F%206.x-3178C6?logo=typescript&logoColor=white)](market-aura-4u-frontend-main/package.json)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3.3-06B6D4?logo=tailwindcss&logoColor=white)](market-aura-4u-frontend-main/package.json)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-S3_Compatible-F38020?logo=cloudflare&logoColor=white)](docs/CLOUDFLARE_R2_SETUP.md)

**Market Aura 4U (Market-for-you)** is an enterprise-ready digital marketing automation platform and multi-channel publishing studio. It unifies brand-grounded AI copywriting, machine learning-driven engagement and format recommendations, automated post scheduling, direct social distribution, and media asset management into one workspace.

- **Frontend Application (Vercel):** [https://market-for-you-two.vercel.app](https://market-for-you-two.vercel.app)
- **Backend REST API (Render):** [https://market-aura-api.onrender.com](https://market-aura-api.onrender.com)
- **GitHub Repository:** [https://github.com/Error-Krishna/Market-for-you](https://github.com/Error-Krishna/Market-for-you)
- **Documentation Suite:** [docs/README.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/README.md)

---

## Table of Contents

1. [Project Introduction](#project-introduction)
2. [Implemented vs Planned Features](#features)
3. [Screenshots and Demo](#screenshots-and-demo)
4. [Technology Stack](#technology-stack)
5. [Architecture Overview & Mermaid Diagrams](#architecture-overview)
6. [Repository Structure](#repository-structure)
7. [Prerequisites](#prerequisites)
8. [Installation and Local Setup](#installation-and-setup)
9. [Environment Variables Reference](#environment-variables)
10. [REST API Documentation](#api-documentation)
11. [Database & Data Models](#database-documentation)
12. [Third-Party Integrations](#integrations)
13. [Testing & Quality Assurance](#testing)
14. [Production Deployment Guide](#deployment-guide)
15. [Troubleshooting & Diagnostics](#troubleshooting)
16. [Security Architecture & Threat Defense](#security-considerations)
17. [Contributing & Development Guidelines](#contributing)
18. [License](#license)

---

## Project Introduction

### The Problem It Solves
Modern marketing teams, agencies, and small businesses face fragmented social media workflows:
- Copywriting for different channels requires rewriting content to fit channel constraints (e.g. 280-character Twitter threads vs professional LinkedIn posts vs multi-slide Instagram carousels).
- Manually posting across Meta (Instagram, Facebook), Twitter/X, and LinkedIn is time-consuming and error-prone.
- Generic AI copywriters lack contextual grounding in specific brand personas, industry UVPs, and historical engagement patterns.
- High egress fees on traditional object storage (like AWS S3) increase infrastructure overhead when distributing images and videos.

### Target Users
- **Solo Founders & Creators:** Automate cross-channel presence from a single marketing brief.
- **Digital Marketing Agencies:** Manage multi-tenant social accounts, consistent brand voice guidelines, and scheduled client campaigns.
- **Growth & E-Commerce Teams:** Generate promotional copy and schedule carousel announcements across multiple channels.

### Core Value Proposition
Market Aura 4U allows marketers to define their brand profile once (company name, industry, UVP, target audience, brand voice) and generate tailored, platform-compliant copy for **Instagram, Twitter/X, LinkedIn, Facebook, Email, and Blog** in a single AI operation. Posts can be immediately published, scheduled for automated background delivery, or enriched with media hosted on Cloudflare R2 with zero egress fees.

---

## Features

### Verified Implemented Features

#### User Authentication & Account Management
- [x] Secure registration and login using `bcrypt` (10 rounds) and 24-hour signed JSON Web Tokens (JWT).
- [x] Dual-mode authentication: Bearer token header authorization (`Authorization: Bearer <token>`) and HTTP-only, SameSite=Strict cookies.
- [x] Two-stage workspace activation: Enforces company profile onboarding (`isOnboarded` middleware) before unlocking dashboard tools.
- [x] In-memory token bucket rate limiting on authentication routes by client IP and target account to mitigate brute-force and credential-stuffing attacks.

#### Brand Profile & Intelligence
- [x] Onboarding wizard collecting company name, industry, tone of voice, unique value proposition (UVP), target audience, and target channels.
- [x] Brand profile persistence in MongoDB with length bounds (5000 characters) to prevent database bloating.
- [x] Deep prompt grounding: Injects brand identity, voice guidelines, and target audience into every LLM completion.

#### AI-Powered Content Generation
- [x] High-speed LLM generation using Groq Cloud API with `openai/gpt-oss-20b` in strict JSON mode (`response_format: { type: "json_object" }`).
- [x] Multi-platform generation in a single call: Generates platform-compliant copy for Twitter (under 280 chars), LinkedIn, Facebook, Instagram (single image or multi-slide carousels), Email, and Blog drafts.
- [x] Contextual image preview generation using keyword-seeded LoremFlickr placeholders.
- [x] Concurrency and rate limiting per user (`GENERATION_MAX_REQUESTS: 10/min`, `GENERATION_MAX_CONCURRENT: 1`).
- [x] Credit metering: Debits 1 credit per generation; rejects requests when monthly credits are exhausted.

#### Machine Learning Recommendation Engine (`CAPSTONE`)
- [x] Offline analytical pipeline training semantic category embeddings (`all-MiniLM-L6-v2`) and Random Forest engagement regressors.
- [x] HTTP microservice (`serve.py`) providing `POST /recommend` with JSON Schema input/output validation.
- [x] Predicts optimal content format (`carousel` vs `image`), recommended posting time window, and expected engagement rate.
- [x] Automatic graceful fallback: If the ML service is sleeping or unconfigured, the Express API gracefully defaults to heuristic guidance without failing.

#### Media Library & Cloudflare R2 Storage
- [x] Cloudflare R2 object storage integration via AWS SDK v3 (`@aws-sdk/client-s3`) with zero data egress fees.
- [x] Automatic R2 endpoint sanitization (`sanitizeR2Endpoint()`) preventing 404 path errors.
- [x] Binary magic bytes inspection (JPEG, PNG, WebP, GIF, MP4) preventing spoofed MIME types.
- [x] Free-tier safeguards: 10MB file size limit, 100MB per-user aggregate storage quota, 100 uploads/month rate limit.
- [x] Duplicate upload detection (reuses existing asset if identical title, size, and MIME exist).
- [x] Active post protection: Rejects deletion of media assets currently referenced by active scheduled posts.
- [x] Local filesystem fallback for offline development (`/uploads/media/:userId/:filename`).

#### Multi-Channel Social Integrations & Publishing
- [x] **Instagram Professional:** Graph API v21.0 containerized publishing flow (container creation, status polling until `FINISHED`, container publish) for single images, carousels, and reels.
- [x] **Meta Unified Login:** OAuth 2.0 via `META_UNIFIED_CONFIG_ID` and multi-tier account discovery (`/me/assigned_instagram_accounts` and `/me/accounts`).
- [x] **Facebook Pages:** Graph API publishing to `/feed` and `/photos` using long-lived Page access tokens.
- [x] **Twitter / X:** OAuth 2.0 PKCE flow, automatic token refresh, tweet posting via v2 API, and chunked media upload via v1.1.
- [x] **LinkedIn:** OAuth 2.0 with Community Management API (`/rest/posts`, `/rest/images?action=initializeUpload`).
- [x] **Email Broadcasts:** Direct newsletter delivery via Resend, SendGrid, or custom Webhooks with attachments.
- [x] **Blog CMS:** Long-form article publishing via WordPress REST API (`/wp-json/wp/v2/posts`), Ghost, Hashnode, or Webhooks.
- [x] **Token Vault:** AES-256-GCM authenticated encryption for all OAuth tokens and secrets at rest.

#### Post Scheduling & Durable Background Execution
- [x] In-process 15-second polling loop with atomic MongoDB job claiming (`findOneAndUpdate` with `lockUntil` and `lockedBy`).
- [x] Distributed lock leasing (2-minute lease) preventing duplicate executions across cluster workers.
- [x] Stepped exponential retry backoff (1m, 5m, 15m) up to 3 attempts.
- [x] Delivery outcome uncertainty protection (`markOutcomeUnknown` / `deliveryOutcomeUnknown: true`): If a worker is interrupted during an external HTTP call, automatic retries halt to prevent double-posting, flagging the post for manual review in the UI.
- [x] Protected external cron trigger endpoint (`ALL /api/v1/scheduler/run`) secured by `CRON_SECRET`.
- [x] Manual broadcast composer for immediate multi-platform publishing.

#### Payments & Subscription Billing
- [x] Razorpay payment gateway integration with three tiers: Starter (₹499/mo, 500 credits), Pro (₹1,499/mo, 2,500 credits), Enterprise (₹4,999/mo, 10,000 credits).
- [x] Constant-time HMAC SHA256 payment signature verification (`crypto.timingSafeEqual`).
- [x] Transaction reuse protection (rejects replay of identical payment IDs).
- [x] Feature toggle (`CHECKOUT_ENABLED=true`).

#### User Settings & Theme
- [x] Dark, Light, and System theme synchronization (`ThemeProvider.tsx`).
- [x] User profile, brand identity, and password updates with timing-safe checks.
- [x] Email notification preference toggles.

### Planned / Not Implemented Features
- ⏳ TikTok and YouTube Shorts native video publishing.
- ⏳ Team multi-user collaboration and role-based permissions (RBAC).
- ⏳ Shared multi-instance Redis rate limiting (currently process-local memory limiter).
- ⏳ In-app image and video editing canvas.

---

## Screenshots and Demo

### Production Deployments
- **Web Application:** [https://market-for-you-two.vercel.app](https://market-for-you-two.vercel.app)
- **API Health Check:** [https://market-aura-api.onrender.com/health](https://market-aura-api.onrender.com/health)
- **Database Readiness:** [https://market-aura-api.onrender.com/ready](https://market-aura-api.onrender.com/ready)

### Existing Repository Assets
The repository contains the official landing page hero banner:
- Location: `market-aura-4u-frontend-main/src/assets/hero.png`

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET AURA 4U HERO BANNER                   │
│                                                                 │
│       [ Unified Digital Marketing & Publishing Studio ]         │
│     AI Generation • ML Analytics • Multi-Channel Publishing     │
└─────────────────────────────────────────────────────────────────┘
```

### Visual Interface Placeholders
*(To add application screenshots, place PNG assets in `docs/images/` and update these markdown references)*

```markdown
<!-- Screenshot 1: Multi-Platform AI Content Generation -->
![AI Content Studio](docs/images/content_studio.png)

<!-- Screenshot 2: Post Scheduling Queue & Delivery Review -->
![Scheduling Queue](docs/images/scheduling_queue.png)

<!-- Screenshot 3: Cloudflare R2 Media Library -->
![Media Library](docs/images/media_library.png)

<!-- Screenshot 4: Connected Social Accounts Management -->
![Social Accounts](docs/images/social_accounts.png)
```

---

## Technology Stack

### Frontend Application
| Technology | Verified Version | Purpose |
|---|---|---|
| **React** | `19.2.8` | Component architecture & concurrent rendering |
| **Vite** | `8.2.2` | Fast bundler, dev server, and HMR |
| **TypeScript** | `~6.0.2` / 5.x | Static typing and type safety |
| **Tailwind CSS** | `4.3.3` | Utility-first styling via `@tailwindcss/vite` |
| **React Router** | `7.18.3` | Client-side routing & route guards |
| **TanStack Query** | `5.102.8` | Server state caching and background refetching |
| **React Hook Form**| `7.87.0` | Form state management |
| **Zod** | `4.5.4` | Schema validation for forms and inputs |
| **Lucide React** | `1.37.0` | Icon system |
| **Axios** | `1.20.0` | HTTP client with automatic base URL normalization |
| **Vitest** | `4.1.11` | Unit and component testing framework |

### Backend REST API
| Technology | Verified Version | Purpose |
|---|---|---|
| **Node.js** | `22.23.5` (LTS) | Server runtime (enforced in `.node-version`) |
| **Express** | `5.1.0` | HTTP routing, middleware, and API endpoints |
| **MongoDB / Mongoose**| `8.19.2` | NoSQL document persistence and schema modeling |
| **AWS SDK v3 S3**| `3.1169.0` | Cloudflare R2 object storage integration |
| **JSON Web Token** | `9.0.2` | User session token signing and verification |
| **bcrypt** | `6.0.0` | Secure password hashing (10 salt rounds) |
| **twitter-api-v2** | `1.27.0` | Twitter / X OAuth 2.0 PKCE and API v2 client |
| **Razorpay SDK** | `2.9.6` | Order checkout and payment signature verification |
| **Node Test Runner**| Built-in (`node --test`)| Backend automated testing framework |

### Machine Learning Engine (`CAPSTONE`)
| Technology | Verified Version | Purpose |
|---|---|---|
| **Python** | `3.11` | Microservice runtime |
| **SentenceTransformers**| `all-MiniLM-L6-v2` | Dense semantic text embeddings for brands |
| **scikit-learn** | `1.3+` | Random Forest engagement regressors |
| **Pytest** | `pytest` | ML pipeline and HTTP endpoint test suite |

---

## Architecture Overview

Market Aura 4U employs a decoupled cloud architecture:
1. **Frontend-to-Backend Communication:** The React 19 SPA runs in the client browser (hosted on Vercel) and communicates with the backend REST API (hosted on Render) via HTTPS. The Axios client automatically prefixes requests with `/v1` and attaches `Authorization: Bearer <token>` from `localStorage`.
2. **CORS Enforcement:** The backend strictly checks the `Origin` header against `CORS_ALLOWED_ORIGINS`. In production, origins must be exact HTTPS domains with no trailing slashes or wildcards.
3. **Database Interactions:** Express connects to MongoDB Atlas using Mongoose 8 with connection pool limits (`maxPoolSize: 20`) and a 5-second failover timeout.
4. **Media Storage:** Binary payloads uploaded as base64 are verified via magic bytes and streamed to Cloudflare R2 using AWS SDK v3. Public URLs are served through Cloudflare with \$0 data egress fees.
5. **Background Scheduling:** An in-process 15-second polling loop claims due posts using atomic `findOneAndUpdate` queries with 2-minute distributed worker leases. An external cron endpoint (`/api/v1/scheduler/run`) secured by `CRON_SECRET` guarantees reliable execution even on sleeping cloud instances.

---

### Architectural Diagrams

#### 1. High-Level System Architecture
```mermaid
flowchart TD
    subgraph ClientTier["Client Application"]
        Browser["React 19 / Vite SPA\n(https://market-for-you-two.vercel.app)"]
    end

    subgraph EdgeTier["Vercel Global Edge CDN"]
        VercelCDN["Static Asset Cache & SPA Rewrites"]
    end

    subgraph ComputeTier["Render Cloud Compute"]
        API["Node.js 22 / Express 5 API\n(https://market-aura-api.onrender.com)"]
        Scheduler["In-Process Polling Scheduler (15s Loop)"]
        CronRunner["Protected Cron Endpoint\n(/api/v1/scheduler/run)"]
        MLService["Python 3.11 ML Recommender\n(Port 8080 / Docker)"]
    end

    subgraph StorageTier["Data & Media Storage"]
        AtlasDB[("MongoDB Atlas 7\n(Replica Set)")]
        R2Bucket[("Cloudflare R2 Bucket\n(market-aura-media-prod)")]
    end

    subgraph ThirdParties["External Platforms & APIs"]
        GroqLLM["Groq Cloud AI (openai/gpt-oss-20b)"]
        MetaAPI["Meta Graph API v21.0 (Instagram & FB)"]
        TwitterAPI["Twitter / X API v2 (OAuth 2.0 PKCE)"]
        LinkedInAPI["LinkedIn REST API"]
        RazorpayAPI["Razorpay Payment Gateway"]
    end

    Browser -->|"HTTPS Static Fetch"| VercelCDN
    Browser -->|"HTTPS REST Calls + Bearer JWT"| API
    API -->|"Mongoose / SCRAM-SHA-256"| AtlasDB
    API -->|"AWS SDK v3 (PutObject/DeleteObject)"| R2Bucket
    API -->|"Internal HTTP / Graceful Fallback"| MLService
    API -->|"HTTPS Chat Completions (JSON Mode)"| GroqLLM
    API -->|"Order Verification (HMAC SHA256)"| RazorpayAPI
    API -->|"OAuth & Publishing"| MetaAPI
    API -->|"OAuth & Publishing"| TwitterAPI
    API -->|"OAuth & Publishing"| LinkedInAPI

    Scheduler -->|"Atomic Claim (findOneAndUpdate)"| AtlasDB
    Scheduler -->|"Publish Due Posts"| MetaAPI
    Scheduler -->|"Publish Due Posts"| TwitterAPI
    Scheduler -->|"Publish Due Posts"| LinkedInAPI
    CronRunner -.->|"Wakeup & Trigger (CRON_SECRET)"| Scheduler
    MetaAPI -->|"Ingest Public Media"| R2Bucket
```

#### 2. Authentication & Onboarding Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant FE as React Frontend
    participant API as Express API
    participant DB as MongoDB Atlas

    User->>FE: Submits email and password on /signup
    FE->>API: POST /api/v1/auth/signup {email, password}
    Note over API: IP & Account rate limit check
    API->>API: bcrypt.hash(password, 10) [max 72 UTF-8 bytes]
    API->>DB: User.create({email, passwordHash, onboardingCompleted: false})
    API->>API: Sign JWT (24h lifespan)
    API-->>FE: HTTP 201 {token, user} + Set-Cookie: token (httpOnly)
    FE->>FE: Store token in localStorage (market-aura-auth-token)
    FE->>FE: ProtectedRoute redirects to /onboarding

    User->>FE: Submits 6-field brand onboarding profile
    FE->>API: POST /api/v1/auth/onboarding (Bearer JWT)
    Note over API: auth middleware verifies JWT signature
    API->>API: Validate fields (max 5000 chars per text property)
    API->>DB: User.updateOne({_id: userId}, {brandProfile, onboardingCompleted: true})
    API-->>FE: HTTP 200 {success: true, user}
    FE->>FE: Redirects to /dashboard
```

#### 3. Social Media OAuth Integration Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant FE as React Frontend
    participant API as Express API
    participant DB as MongoDB Atlas
    participant Meta as Meta OAuth Dialog

    User->>FE: Clicks "Connect Instagram" on /social-accounts
    FE->>API: GET /api/v1/auth/social/instagram/connect (Bearer JWT)
    API->>API: Generate 24-byte random state token
    API->>DB: OAuthState.create({state, userId, platform: 'instagram', expiresAt: +10m})
    API-->>FE: HTTP 200 {url: "https://www.facebook.com/v21.0/dialog/oauth?..."}
    FE->>Meta: Browser redirects to Meta OAuth dialog

    User->>Meta: Approves requested permissions
    Meta->>API: GET /api/v1/auth/social/instagram/callback?code=CODE&state=STATE
    API->>DB: OAuthState.findOneAndDelete({state, platform: 'instagram'})
    Note over API: Single-use state verification prevents replay attacks
    API->>Meta: Exchange code for long-lived access token
    Meta-->>API: Returns {access_token, expires_in}
    API->>Meta: Multi-fallback discovery (/me/assigned_instagram_accounts)
    API->>API: Encrypt access token using AES-256-GCM (12-byte IV + tag)
    API->>DB: Upsert SocialAccount({userId, provider: 'instagram', encryptedAccessToken})
    API->>DB: Update User.socialAccounts.instagram.isConnected = true
    API-->>User: HTTP 302 Redirect to ${FRONTEND_URL}/social-accounts?connected=instagram
    User->>FE: Frontend refreshes connected account status
```

#### 4. Content Creation & Publishing Workflow
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Marketer
    participant FE as React Frontend
    participant API as Express API
    participant ML as Python ML Recommender
    participant Groq as Groq Cloud AI
    participant DB as MongoDB Atlas

    User->>FE: Enters campaign brief on /content/create
    FE->>API: POST /api/v1/content/generate {prompt} (Bearer JWT)
    Note over API: Verify auth, isOnboarded, user credits (debit 1 on success)
    Note over API: Acquire concurrency slot (max 1 concurrent per user)

    API->>ML: POST /recommend {brand_name, uvp, industry, target_audience}
    alt ML Engine Available
        ML-->>API: Returns {recommended_format, optimal_time, engagement}
    else ML Engine Unavailable / Timeout
        Note over API: Gracefully degrade: continue with heuristic guidance
    end

    API->>DB: Job.create({userId, platforms, status: 'processing', prompt})
    API->>API: Ground prompt: Brand Intelligence + ML Signals + JSON Schema
    API->>Groq: POST /chat/completions (model: openai/gpt-oss-20b, json_object)
    Groq-->>API: Returns structured multi-channel JSON copy
    API->>API: validateAndNormalizeContent (280-char tweets, carousel slides)
    API->>API: Attach contextual LoremFlickr image preview URL
    API->>DB: Job.findByIdAndUpdate(jobId, {status: 'completed', generatedContent})
    API->>DB: User.credits.used += 1
    API-->>FE: HTTP 200 {success: true, job}
    FE-->>User: Renders interactive platform copy cards
```

#### 5. Media Upload & Storage Subsystem Workflow
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Marketer
    participant FE as React Frontend
    participant API as Express API
    participant DB as MongoDB Atlas
    participant R2 as Cloudflare R2 Bucket
    participant Meta as Meta Graph API

    User->>FE: Selects image/video in MediaPickerModal
    FE->>FE: Reads file as Base64 Data URL
    FE->>API: POST /api/v1/media {title, dataBase64, mimeType}
    Note over API: Verify auth, monthly limit (100) & quota (100MB)
    Note over API: Validate magic bytes (JPEG/PNG/GIF/WebP/MP4) & size <= 10MB
    Note over API: Check duplicate asset (reuse if title/size/mime match)

    alt Cloudflare R2 Storage (MEDIA_STORAGE_PROVIDER=r2)
        API->>API: Generate key: media/{userId}/{uuid}.{ext}
        API->>R2: PutObjectCommand({Bucket, Key, Body, ContentType})
        R2-->>API: PutObject success (HTTP 200)
        API->>API: Formulate public URL: https://{R2_PUBLIC_BASE_URL}/{key}
    else Local Storage Fallback
        API->>API: Write file to filesystem: uploads/media/{userId}/{uuid}.{ext}
        API->>API: Formulate URL: http://{host}/uploads/media/{userId}/{filename}
    end

    API->>DB: MediaAsset.create({userId, title, mediaType, url, storageKey, sizeBytes})
    API-->>FE: HTTP 201 {success: true, media: MediaAsset}

    Note over API,Meta: During Scheduled Post Delivery
    API->>Meta: POST /v21.0/{ig_id}/media {image_url: R2_PUBLIC_URL}
    Meta->>R2: Public HTTP GET to R2 URL
    R2-->>Meta: Returns 200 OK with binary stream
    Meta-->>API: Returns container ID
    API->>Meta: POST /v21.0/{ig_id}/media_publish {creation_id}
    Meta-->>API: Returns published post ID
```

---

## Repository Structure

```
Market-for-you/
├── .github/
│   └── workflows/ci.yml           # GitHub Actions CI matrix (Frontend, Backend, ML)
├── .husky/                        # Git hooks (pre-commit quality gates, pre-push test suites)
├── api/
│   └── index.js                   # Serverless compatibility bridge (for Vercel serverless testing)
├── CAPSTONE/                      # Python 3.11 ML Recommender microservice
│   ├── contract/                  # JSON Schema input and output validation contracts
│   ├── src/                       # HTTP daemon (serve.py) & pipeline logic (pipeline.py)
│   ├── tests/                     # Pytest suite (test_pipeline.py, test_serve.py)
│   ├── Dockerfile                 # Standalone Docker container definition
│   └── requirements-prod.txt      # Production Python dependencies
├── deployment/                    # Containerization and hosting configuration templates
├── docs/                          # Comprehensive technical documentation suite
│   ├── README.md                  # Documentation index & reading paths
│   ├── ARCHITECTURE.md            # In-depth system architecture & subsystem flows
│   ├── API_REFERENCE.md           # Exhaustive REST API catalog & schemas
│   ├── DATABASE.md                # MongoDB schemas, compound indexes, TTL, concurrency
│   ├── ENVIRONMENT_VARIABLES.md   # Master environment variable reference
│   ├── AUTHENTICATION.md          # Session model, bcrypt boundaries, rate limiting, token vault
│   ├── INTEGRATIONS.md            # Meta, Twitter, LinkedIn, Groq, R2, Razorpay guides
│   ├── DEPLOYMENT.md              # Production deployment runbook (Vercel, Render, Atlas, R2)
│   ├── TESTING.md                 # Testing guide (Vitest, Node test runner, Pytest)
│   ├── TROUBLESHOOTING.md         # Diagnostic runbook for operational issues
│   ├── SECURITY.md                # Cryptographic controls, SSRF defenses, CORS enforcement
│   └── CONTRIBUTING.md            # Development workflows, git conventions, PR guidelines
├── market-aura-4u-backend-main/   # Node.js 22 LTS / Express 5 REST API & Scheduler
│   ├── src/                       # Application source (app.js, controllers, models, routes, services)
│   ├── tests/                     # 31 test suites (492 unit & route tests)
│   ├── Dockerfile                 # Standalone Node.js Docker container definition
│   └── package.json               # Backend dependencies and test scripts
├── market-aura-4u-frontend-main/  # React 19 / TypeScript / Vite Single-Page Application
│   ├── src/                       # Application source (pages, features, components, router)
│   ├── tests/                     # 8 test suites (44 Vitest tests)
│   ├── Dockerfile                 # Nginx-based production container definition
│   ├── nginx.conf                 # Nginx SPA rewrite configuration
│   └── package.json               # Frontend dependencies and Vite build scripts
├── scripts/
│   └── verify-deployment.js       # Pre-flight container, bundle, and secret hygiene verifier
├── docker-compose.yml             # Local multi-service orchestration (Frontend, Backend, ML, Mongo)
├── docker-compose.prod.yml        # Production Docker Compose orchestration
├── render.yaml                    # Render Infrastructure-as-Code Blueprint
├── vercel.json                    # Vercel Edge routing, caching, and security headers
├── .node-version                  # Node.js version lock (22.23.5)
└── package.json                   # Root monorepo workspace configuration
```

---

## Prerequisites

To run Market Aura 4U locally or deploy it to cloud infrastructure, ensure you have:

- **Node.js:** `v22.23.5` (LTS) — specified in `.node-version`. (Node `>=20.0.0` supported).
- **npm:** `v10.x` or higher.
- **Python:** `v3.11` (only if running the local ML Recommender in `CAPSTONE/`).
- **MongoDB:** Local MongoDB instance running on `mongodb://localhost:27017` or a free MongoDB Atlas connection string.
- **Groq Cloud API Key:** Required for AI content generation ([console.groq.com](https://console.groq.com)).

---

## Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Error-Krishna/Market-for-you.git
cd Market-for-you
```

### 2. Install Workspace Dependencies
Install all root, backend, and frontend dependencies using the monorepo lockfile:
```bash
npm ci --engine-strict
```

### 3. Configure Local Environment Variables
Create `.env` configuration files for the backend and frontend:

- **Backend Configuration:**
  ```bash
  cp market-aura-4u-backend-main/.env.example market-aura-4u-backend-main/.env
  ```
  Edit `market-aura-4u-backend-main/.env` and supply:
  - `MONGO_URI`: `mongodb://localhost:27017/market_aura`
  - `JWT_SECREAT_KEY`: Generate with `openssl rand -hex 32`
  - `TOKEN_ENCRYPTION_KEY`: Generate with `openssl rand -hex 32`
  - `GROQ_API_KEY`: Your personal Groq API key

- **Frontend Configuration:**
  ```bash
  cp market-aura-4u-frontend-main/.env.example market-aura-4u-frontend-main/.env
  ```
  Ensure `VITE_API_BASE_URL=http://localhost:8000/api`.

- **ML Engine Configuration (Optional):**
  ```bash
  cd CAPSTONE
  python3.11 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements-prod.txt pytest
  cd ..
  ```

### 4. Run the Application Locally
Run all three services concurrently using the root workspace script:
```bash
npm run dev
```

Or start the services individually in separate terminals:
- **Backend API:** `npm --prefix market-aura-4u-backend-main start` (Listening on `http://localhost:8000`)
- **Frontend SPA:** `npm --prefix market-aura-4u-frontend-main run dev` (Listening on `http://localhost:5173`)
- **ML Recommender:** `cd CAPSTONE && .venv/bin/python src/serve.py` (Listening on `http://localhost:8080`)

Open your browser to `http://localhost:5173` to access the application.

---

## Environment Variables

The table below summarizes the core variables. For the exhaustive specification, see [docs/ENVIRONMENT_VARIABLES.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/ENVIRONMENT_VARIABLES.md).

| Variable Name | Service | Purpose | Required in Prod | Example Safe Placeholder |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend | Backend API base URL for client Axios requests | **Yes** | `https://market-aura-api.onrender.com/api` |
| `NODE_ENV` | Backend | Runtime environment (`production`/`development`) | **Yes** | `production` |
| `PORT` | Backend | Port on which Express binds | **Yes** | `10000` |
| `PUBLIC_BACKEND_URL` | Backend | Public canonical URL for generating OAuth callbacks | **Yes** | `https://market-aura-api.onrender.com` |
| `FRONTEND_URL` | Backend | Public frontend URL for post-OAuth browser redirects | **Yes** | `https://market-for-you-two.vercel.app` |
| `CORS_ALLOWED_ORIGINS`| Backend | Whitelist of exact HTTPS origins allowed | **Yes** | `https://market-for-you-two.vercel.app` |
| `MONGO_URI` | Backend | MongoDB Atlas connection string | **Yes** (Secret) | `mongodb+srv://user:pass@cluster.mongodb.net/market_aura` |
| `JWT_SECREAT_KEY` | Backend | Signing key for user session JSON Web Tokens | **Yes** (Secret) | `replace_with_64_character_hex_string` |
| `TOKEN_ENCRYPTION_KEY`| Backend| AES-256-GCM 32-byte key for encrypting OAuth tokens | **Yes** (Secret) | `replace_with_64_character_hex_string` |
| `CRON_SECRET` | Backend | Secret key guarding `/api/v1/scheduler/run` | **Yes** (Secret) | `replace_with_random_string` |
| `GROQ_API_KEY` | Backend | Groq Cloud API key for fast LLM copywriting | **Yes** (Secret) | `gsk_your_groq_api_key_here` |
| `MEDIA_STORAGE_PROVIDER`| Backend| Active storage engine (`r2` or `local`) | **Yes** | `r2` |
| `R2_ACCOUNT_ID` | Backend | Cloudflare account identifier | **Yes** (if R2) | `your_cloudflare_account_id` |
| `R2_ACCESS_KEY_ID` | Backend | Cloudflare R2 S3 access key | **Yes** (Secret) | `your_r2_access_key_id` |
| `R2_SECRET_ACCESS_KEY`| Backend| Cloudflare R2 S3 secret access key | **Yes** (Secret) | `your_r2_secret_access_key` |
| `R2_BUCKET_NAME` | Backend | Cloudflare R2 storage bucket name | **Yes** (if R2) | `market-aura-media-prod` |
| `R2_PUBLIC_BASE_URL` | Backend | Public HTTPS URL for serving uploaded media | **Yes** (if R2) | `https://pub-xxxxxxxx.r2.dev` |
| `META_UNIFIED_CONFIG_ID`| Backend| Meta Unified Login configuration ID | **Yes** | `1128283246795449` |
| `FACEBOOK_APP_ID` | Backend | Meta Application ID | **Yes** | `your_facebook_app_id` |
| `FACEBOOK_APP_SECRET`| Backend | Meta Application Secret | **Yes** (Secret) | `your_facebook_app_secret` |
| `CHECKOUT_ENABLED` | Backend | Toggle for Razorpay billing endpoints | No (Default: true)| `true` |
| `RAZORPAY_KEY_ID` | Backend | Razorpay key identifier | **Yes** (if billing)| `rzp_live_your_key_id` |
| `RAZORPAY_KEY_SECRET`| Backend | Razorpay secret key | **Yes** (Secret) | `your_razorpay_secret` |

---

## API Documentation

For the complete API reference with full request/response schemas, see [docs/API_REFERENCE.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/API_REFERENCE.md).

### Summary of Core Endpoints

#### Health Checks
- `GET /health`: Process liveness check. (Returns 200 OK timestamp; does not test DB).
- `GET /ready`: Database readiness check. (Returns 200 OK if MongoDB is connected, 503 if unavailable).

#### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/signup`: User registration (validates 72-byte password boundary; issues JWT & cookie).
- `POST /api/v1/auth/login`: User login (rate-limited by IP and account; issues JWT & cookie).
- `POST /api/v1/auth/logout`: Clears session cookie.
- `GET /api/v1/auth/profile`: Retrieves current user profile, credits, and brand context (Auth required).
- `POST /api/v1/auth/onboarding`: Submits 6-field company profile, unlocks workspace (Auth required).

#### Social Accounts (`/api/v1/auth/social`)
- `GET /api/v1/auth/social/status`: Returns connection status across all platforms (Auth required).
- `GET /api/v1/auth/social/accounts`: Lists multi-tenant social accounts with tokens redacted (Auth required).
- `GET /api/v1/auth/social/instagram/connect`: Initiates Meta OAuth flow (Auth required).
- `GET /api/v1/auth/social/instagram/callback`: Meta OAuth callback; discovers accounts, encrypts tokens.
- `GET /api/v1/auth/social/twitter/connect`: Initiates Twitter / X OAuth 2.0 PKCE flow (Auth required).
- `GET /api/v1/auth/social/twitter/callback`: Twitter OAuth callback; exchanges token, stores in vault.
- `GET /api/v1/auth/social/linkedin/connect`: Initiates LinkedIn OAuth flow (Auth required).
- `GET /api/v1/auth/social/linkedin/callback`: LinkedIn OAuth callback; stores member URN and token.
- `POST /api/v1/auth/social/facebook/select-page`: Selects active Facebook Page for publishing (Auth required).
- `DELETE /api/v1/auth/social/accounts/:id`: Disconnects and purges social account credentials (Auth required).

#### Content Generation (`/api/v1/content`)
- `POST /api/v1/content/generate`: Generates tailored multi-platform copy via Groq AI (Auth + Onboarded).
- `POST /api/v1/content/publish`: Publishes copy directly to a connected social channel (Auth + Onboarded).
- `GET /api/v1/content/history`: Fetches past generation jobs and saved copy (Auth + Onboarded).

#### Post Scheduling (`/api/v1/posts`)
- `POST /api/v1/posts`: Schedules a post for future delivery or submits manual broadcast (Auth + Onboarded).
- `GET /api/v1/posts`: Lists posts in the scheduling queue with status filters (Auth + Onboarded).
- `POST /api/v1/posts/:id/publish-now`: Triggers immediate delivery of a scheduled post (Auth + Onboarded).
- `POST /api/v1/posts/:id/retry`: Retries delivery for failed platform targets (Auth + Onboarded).
- `POST /api/v1/posts/:id/resolve-delivery`: Resolves uncertain delivery state after worker crash (Auth + Onboarded).
- `POST /api/v1/posts/:id/cancel`: Cancels pending delivery (Auth + Onboarded).
- `DELETE /api/v1/posts/:id`: Deletes post from queue (Auth + Onboarded).

#### Media Library (`/api/v1/media`)
- `GET /api/v1/media`: Lists media library assets with type and search filters (Auth + Onboarded).
- `POST /api/v1/media`: Uploads base64 payload to R2 or registers public URL (Auth + Onboarded).
- `PUT /api/v1/media/:id`: Updates media asset title, alt text, and tags (Auth + Onboarded).
- `DELETE /api/v1/media/:id`: Purges asset from R2 and MongoDB (Delete-protected if scheduled) (Auth + Onboarded).
- `GET /uploads/media/:userId/:filename`: Serves locally uploaded assets with CORP headers (Public).

#### Payments & Billing (`/api/v1/payments`)
- `GET /api/v1/payments/plans`: Returns subscription tiers, credits, and INR pricing (Public).
- `GET /api/v1/payments/subscription`: Returns active subscription details and credit usage (Auth required).
- `POST /api/v1/payments/create-order`: Creates Razorpay order for subscription checkout (Auth required).
- `POST /api/v1/payments/verify`: Verifies Razorpay HMAC signature and increments credits (Auth required).

#### Background Scheduler Cron (`/api/v1/scheduler`)
- `ALL /api/v1/scheduler/run`: Protected cron endpoint; claims and executes due posts (Requires `CRON_SECRET`).

---

## Database Documentation

For complete schema definitions, see [docs/DATABASE.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/DATABASE.md).

### Summary of Models
1. **`User`:** Account credentials, brand profile, usage credits (`credits.monthly`, `credits.used`), subscription tier, and settings.
2. **`SocialAccount`:** Multi-tenant, multi-account social credentials. Enforces compound unique index `{ userId: 1, provider: 1, providerAccountId: 1 }`. Encrypted tokens are flagged with `select: false` and redacted during JSON serialization.
3. **`ScheduledPost`:** Queue of scheduled posts with platform delivery subdocuments, optimistic concurrency (`__v`), distributed locks (`lockedBy`, `lockUntil`), retry backoff metadata, and `deliveryOutcomeUnknown` uncertainty flags.
4. **`MediaAsset`:** Media assets with title, alt text, tags, media type (`image`/`video`), storage provider (`r2`/`local`), and public HTTPS URL.
5. **`Job`:** Records of AI generation jobs with original prompts, target channels, and structured multi-platform outputs.
6. **`OAuthState`:** Short-lived OAuth state tokens for PKCE and CSRF validation. Uses a MongoDB TTL index on `expiresAt` (`{ expires: 0 }`) to automatically purge expired states after 10 minutes.

---

## Integrations

For complete setup guides for all third-party services, see [docs/INTEGRATIONS.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/INTEGRATIONS.md).

- **Meta (Instagram & Facebook):** Graph API v21.0 containerized publishing for Instagram Professional accounts and Facebook Pages. Requires public HTTPS media URLs from Cloudflare R2.
- **Twitter / X:** API v2 tweet creation and v1.1 chunked media upload with OAuth 2.0 PKCE.
- **LinkedIn:** Community Management REST API with image upload initialization and post creation.
- **Groq Cloud AI:** High-speed LLM inference using `openai/gpt-oss-20b` in JSON mode.
- **Cloudflare R2:** Zero-egress S3-compatible media storage.
- **Razorpay:** Payment processing with server-side order creation and constant-time HMAC SHA256 validation.
- **Email & Blog:** Direct publishing via Resend, SendGrid, WordPress REST API, Ghost, Hashnode, and Webhooks.

---

## Testing

For testing procedures, see [docs/TESTING.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/TESTING.md).

### Automated Test Commands
Run from the root workspace directory:
```bash
# Run all code quality checks (ESLint, Prettier, TypeScript typechecking)
npm run lint

# Run all unit and integration test suites (Backend CI + Frontend Vitest)
npm run test

# Run Python ML Recommender pytest suite
npm run test:ml

# Execute production frontend bundle build
npm run build

# Run automated pre-flight deployment verification
npm run verify:deployment
```

### Verified Test Counts
- **Backend CI Test Suite:** 492 passed, 0 failed (across 31 test files).
- **Frontend Vitest Suite:** 44 passed, 0 failed (across 8 test files).
- **ML Recommender Pytest Suite:** 24 passed, 1 skipped, 0 failed.
- **Deployment Manifest & Hygiene Verification:** 0 errors (Ready for production).

---

## Deployment Guide

For the full deployment walkthrough, see [docs/DEPLOYMENT.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/DEPLOYMENT.md).

### Cloud Infrastructure Topography
- **Frontend:** Hosted on **Vercel** as a static Vite SPA at `https://market-for-you-two.vercel.app`.
- **Backend API:** Hosted on **Render** as a long-running Node.js Web Service at `https://market-aura-api.onrender.com`.
- **Database:** Hosted on **MongoDB Atlas** (Replica Set).
- **Media Assets:** Hosted on **Cloudflare R2** with zero egress fees.

### Critical Deployment Considerations
1. **Python ML Recommender Separation:** The Python ML recommender (`CAPSTONE/`) was excluded from the Free Render deployment due to memory limits (requires >= 1GB RAM vs 512MiB free tier cap). The Express API operates with automatic graceful fallback when the recommender is unconfigured or sleeping.
2. **Scheduler Reliability on Render Free Tier:** Render Free tier instances spin down after 15 minutes of zero traffic, suspending in-process timers. Configure an external cron monitor (e.g. [cron-job.org](https://cron-job.org) or GitHub Actions) to ping `POST https://market-aura-api.onrender.com/api/v1/scheduler/run` with `CRON_SECRET` every 5–10 minutes, or upgrade to Render Starter ($7/mo).
3. **Health vs Readiness:** `/health` returns 200 OK process status without checking the database. Use `/ready` to verify that MongoDB is connected.

---

## Troubleshooting

For verified solutions to common issues, see [docs/TROUBLESHOOTING.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/TROUBLESHOOTING.md).

- **CORS Errors (`HTTP 403 ORIGIN_NOT_ALLOWED`):** Ensure `CORS_ALLOWED_ORIGINS` on Render contains the exact `https://market-for-you-two.vercel.app` URL with no trailing slash.
- **Meta `redirect_uri_mismatch`:** In Meta Developer Console, ensure Valid OAuth Redirect URIs match `${PUBLIC_BACKEND_URL}/api/v1/auth/social/instagram/callback` exactly.
- **R2 Upload `UnknownError NotFound`:** Do not include the bucket name in `R2_ENDPOINT`. Let `sanitizeR2Endpoint()` derive `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` automatically.
- **Vercel 404 on Page Refresh:** Ensure `vercel.json` includes the catch-all rewrite to `/index.html`.

---

## Security Considerations

For the comprehensive security architecture and threat model, see [docs/SECURITY.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/SECURITY.md).

- **Token Encryption:** All OAuth access tokens and webhook secrets are encrypted at rest with AES-256-GCM using unique 12-byte IVs and 16-byte authentication tags.
- **Bcrypt Boundary Defense:** New passwords are capped at 72 UTF-8 bytes to prevent silent truncation vulnerabilities in the bcrypt algorithm.
- **SSRF Protection:** `validatePublicHttpUrl()` blocks loopback and private IPv4/IPv6 address ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1`, `fe80::/10`).
- **Binary Magic Bytes Inspection:** Uploaded files are validated against binary headers (JPEG, PNG, WebP, GIF, MP4) rather than relying on declared MIME types.
- **Fail-Fast Key Validation:** Production server startup aborts immediately if `TOKEN_ENCRYPTION_KEY` is a dummy placeholder or if JWT keys are missing.
- **Constant-Time Verification:** Payment signatures are verified using `crypto.timingSafeEqual` to eliminate timing attacks.

---

## Contributing

For contribution workflows, git branching conventions, and quality gates, see [docs/CONTRIBUTING.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/CONTRIBUTING.md).

1. Follow Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
2. Ensure all pre-commit hooks (`lint-staged`, typechecking, ESLint) pass.
3. Ensure all root tests pass: `npm run test` and `npm run verify:deployment`.

---

## License

This repository is currently managed as a private software project (`"private": true` in the root `package.json`). The backend module `market-aura-4u-backend-main` carries an ISC license declaration in its package manifest. Comprehensive licensing terms for the complete multi-service application have not yet been provided by the project owners. For commercial licensing or usage inquiries, contact the repository maintainers.
