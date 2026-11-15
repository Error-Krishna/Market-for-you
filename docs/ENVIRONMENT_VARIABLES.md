# Market Aura 4U — Environment Variables Specification

This document provides the definitive, centralized source of truth for all environment variables used in the Market Aura 4U platform across the Frontend (Vercel), Backend API (Render), Machine Learning Engine (CAPSTONE), and Local Development environments.

---

## 1. Master Placement & Requirement Matrix

| Environment Variable | Service | Vercel (Frontend) | Render API | Render ML | Local `.env` | Secret / Public | Required in Production |
|---|---|---|---|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend | **Yes** | No | No | Frontend | Public | **Yes** |
| `VITE_API_URL` | Frontend (Alias) | Optional | No | No | Frontend | Public | Optional (Fallback) |
| `NODE_ENV` | Backend | No | **Yes** (`production`) | No | Backend | Public | **Yes** |
| `PORT` | Backend / ML | No | **Yes** (`10000`) | **Yes** (`8080`) | Backend (`8000`) | Public | **Yes** (Platform assigned) |
| `PUBLIC_BACKEND_URL` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Canonical backend URL) |
| `FRONTEND_URL` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Frontend redirect URL) |
| `CORS_ALLOWED_ORIGINS` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Strict HTTPS) |
| `MONGO_URI` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (MongoDB Atlas) |
| `MONGO_MAX_POOL_SIZE` | Backend | No | Optional (`20`) | No | Backend | Public | No (Default: 20) |
| `JWT_SECREAT_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (Canonical key) |
| `JWT_SECRET_KEY` | Backend (Alias) | No | Optional | No | Backend | **Secret** | Optional (Alias) |
| `TOKEN_ENCRYPTION_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (32-byte hex string) |
| `CRON_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (For `/scheduler/run`) |
| `CHECKOUT_ENABLED` | Backend | No | **Yes** (`true`) | No | Backend | Public | No (Default: `true`) |
| `RAZORPAY_KEY_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (If checkout enabled) |
| `RAZORPAY_KEY_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (If checkout enabled) |
| `GROQ_API_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (LLM generation) |
| `GROQ_MODEL` | Backend | No | Optional | No | Backend | Public | No (Default: `openai/gpt-oss-20b`) |
| `GROQ_MAX_OUTPUT_TOKENS` | Backend | No | Optional | No | Backend | Public | No (Default: 1536) |
| `GROQ_TIMEOUT_MS` | Backend | No | Optional | No | Backend | Public | No (Default: 45000) |
| `MEDIA_STORAGE_PROVIDER` | Backend | No | **Yes** (`r2`) | No | Backend | Public | **Yes** (`r2` for production) |
| `R2_ACCOUNT_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (when provider=r2) |
| `R2_ACCESS_KEY_ID` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (when provider=r2) |
| `R2_SECRET_ACCESS_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (when provider=r2) |
| `R2_BUCKET_NAME` | Backend | No | **Yes** | No | Backend | Public | **Yes** (when provider=r2) |
| `R2_ENDPOINT` | Backend | No | Optional | No | Backend | Public | No (Auto-derived from account) |
| `R2_PUBLIC_BASE_URL` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Public HTTPS domain) |
| `R2_PUBLIC_URL` | Backend (Alias) | No | Optional | No | Backend | Public | Optional (Fallback) |
| `R2_REGION` | Backend | No | Optional (`auto`) | No | Backend | Public | No (Default: `auto`) |
| `MEDIA_STORAGE_PREFIX` | Backend | No | Optional (`media`)| No | Backend | Public | No (Default: `media`) |
| `MEDIA_UPLOADS_ENABLED` | Backend | No | Optional (`true`) | No | Backend | Public | No (Default: `true`) |
| `MEDIA_MAX_UPLOAD_BYTES`| Backend | No | Optional | No | Backend | Public | No (Default: 10485760 = 10MB) |
| `MEDIA_USER_STORAGE_QUOTA_BYTES` | Backend | No | Optional | No | Backend | Public | No (Default: 104857600 = 100MB) |
| `MEDIA_USER_MONTHLY_UPLOAD_LIMIT` | Backend | No | Optional | No | Backend | Public | No (Default: 100) |
| `FACEBOOK_APP_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Meta integration) |
| `FACEBOOK_APP_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (Meta integration) |
| `FACEBOOK_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | No (Derived from backend URL) |
| `INSTAGRAM_APP_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Meta integration) |
| `INSTAGRAM_APP_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (Meta integration) |
| `INSTAGRAM_REDIRECT_URI`| Backend | No | Optional | No | Backend | Public | No (Derived from backend URL) |
| `META_UNIFIED_CONFIG_ID`| Backend | No | **Yes** | No | Backend | Public | **Yes** (Required in production) |
| `TWITTER_CLIENT_ID` | Backend | No | Optional | No | Backend | Public | Optional (Twitter OAuth 2.0) |
| `TWITTER_CLIENT_SECRET` | Backend | No | Optional | No | Backend | **Secret** | Optional (Twitter OAuth 2.0) |
| `TWITTER_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | Optional (Derived from backend URL) |
| `LINKEDIN_CLIENT_ID` | Backend | No | Optional | No | Backend | Public | Optional (LinkedIn OAuth 2.0) |
| `LINKEDIN_CLIENT_SECRET`| Backend | No | Optional | No | Backend | **Secret** | Optional (LinkedIn OAuth 2.0) |
| `LINKEDIN_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | Optional (Derived from backend URL) |
| `RECOMMENDER_URL` | Backend | No | Optional | No | Backend | Public | No (Graceful fallback if unset) |
| `RECOMMENDER_HEALTH_URL`| Backend | No | Optional | No | Backend | Public | No (Defaults to `/health`) |
| `RECOMMENDER_AUTH_MODE` | Backend | No | Optional (`none`) | No | Backend | Public | No (`none` for private loopback) |
| `RECOMMENDER_TIMEOUT_MS`| Backend | No | Optional (`15000`)| No | Backend | Public | No (Integer 1-120000) |
| `RECOMMENDER_AUDIENCE` | Backend | No | Optional | No | Backend | Public | No (Only for GCP Cloud Run) |
| `AUTH_PROXY_MODE` | Backend | No | Optional (`direct`)| No | Backend | Public | No (`direct` or `trusted-cidrs`) |
| `AUTH_TRUSTED_PROXY_CIDRS`| Backend| No | Optional | No | Backend | Public | No (Only if `trusted-cidrs`) |
| `AUTH_WINDOW_MS` | Backend | No | Optional | No | Backend | Public | No (Default: 900000 = 15m) |
| `AUTH_MAX_IP_ATTEMPTS` | Backend | No | Optional | No | Backend | Public | No (Default: 30) |
| `AUTH_MAX_ACCOUNT_ATTEMPTS` | Backend | No | Optional | No | Backend | Public | No (Default: 10) |
| `AUTH_MAX_CONCURRENT` | Backend | No | Optional | No | Backend | Public | No (Default: 4) |
| `AUTH_MAX_TRACKED_KEYS` | Backend | No | Optional | No | Backend | Public | No (Default: 10000) |
| `GENERATION_MAX_REQUESTS`| Backend | No | Optional | No | Backend | Public | No (Default: 10) |
| `GENERATION_WINDOW_MS` | Backend | No | Optional | No | Backend | Public | No (Default: 60000 = 1m) |
| `GENERATION_MAX_CONCURRENT`| Backend | No | Optional | No | Backend | Public | No (Default: 1) |
| `GENERATION_MAX_USERS` | Backend | No | Optional | No | Backend | Public | No (Default: 10000) |
| `RECOMMENDER_HOST` | ML Service | No | No | **Yes** (`0.0.0.0`)| ML Service | Public | No (Default: 0.0.0.0) |
| `HF_HUB_OFFLINE` | ML Service | No | No | **Yes** (`1`) | ML Service | Public | **Yes** (Offline inference) |

---

## 2. Detailed Variable Reference

### A. Frontend Variables (Configured on Vercel)

> [!WARNING]
> All `VITE_` variables are embedded directly into the public client-side JavaScript bundle during the build step (`npm run build`). Never put private keys, database passwords, JWT secrets, or encryption keys in frontend environment variables.

#### `VITE_API_BASE_URL` (Recommended Standard)
- **Service:** React 19 Frontend (Vite)
- **Required:** **Yes**
- **Format:** `https://<market-aura-api>.onrender.com/api` (or local: `http://localhost:8000/api`)
- **Normalization Logic:** Handled in `src/app/config/env.ts`. If given bare `https://<api>.onrender.com`, it appends `/api`. If given `.../api/v1`, it automatically trims `/v1` because client feature routes already specify `/v1/...`.

#### `VITE_API_URL` (Backward-Compatible Alias)
- **Service:** React 19 Frontend (Vite)
- **Required:** Optional (fallback for `VITE_API_BASE_URL`)

---

### B. Core Server & Runtime Variables (Render API)

#### `NODE_ENV`
- **Required:** **Yes**
- **Values:** `production` | `development` | `test`
- **Purpose:** Activates production security gates (e.g. strict HTTPS CORS check, fail-fast token encryption placeholder rejection).

#### `PORT`
- **Required:** **Yes** (Render automatically assigns `PORT=10000`; local default is `8000`)
- **Purpose:** Port on which Express listens for incoming HTTP connections.

#### `PUBLIC_BACKEND_URL`
- **Required:** **Yes**
- **Format:** `https://<market-aura-api>.onrender.com` (no trailing slash)
- **Purpose:** Canonical public backend address used to dynamically generate OAuth redirect URIs and verify callback parameters.

#### `FRONTEND_URL`
- **Required:** **Yes**
- **Format:** `https://<market-aura-project>.vercel.app` (no trailing slash)
- **Purpose:** Public destination URL where the backend redirects users after completing third-party OAuth flows (e.g. `${FRONTEND_URL}/social-accounts?connected=instagram`).

#### `CORS_ALLOWED_ORIGINS`
- **Required:** **Yes** (in production)
- **Format:** Comma-separated list of exact HTTPS origins: `https://<market-aura-project>.vercel.app`
- **Validation Rules:**
  - Wildcards (`*`) are strictly prohibited and throw an immediate startup error.
  - In `production`, origins MUST use the `https:` protocol.
  - No trailing slashes, paths, or query fragments are allowed.

#### `MONGO_URI`
- **Required:** **Yes**
- **Secret:** **Yes**
- **Format:** `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/market_aura?retryWrites=true&w=majority`
- **Purpose:** MongoDB Atlas connection string for user accounts, brand profiles, posts, media assets, and jobs.

#### `MONGO_MAX_POOL_SIZE`
- **Required:** No (Default: `20` for persistent web services, `10` for serverless)
- **Purpose:** Caps concurrent database connections per node process to prevent exceeding Atlas tier limits.

#### `JWT_SECREAT_KEY` (Canonical) & `JWT_SECRET_KEY` (Alias)
- **Required:** **Yes** (at least one must be provided in production)
- **Secret:** **Yes**
- **Format:** 64-character hexadecimal string (generate with `openssl rand -hex 32`).
- **Purpose:** Signs and verifies user session JSON Web Tokens (24h lifespan). Note the canonical spelling `JWT_SECREAT_KEY` preserved from the original codebase.

#### `TOKEN_ENCRYPTION_KEY`
- **Required:** **Yes**
- **Secret:** **Yes**
- **Format:** 64-character hexadecimal string (32 bytes for AES-256-GCM; generate with `openssl rand -hex 32`).
- **Validation:** Startup guard explicitly rejects default zero placeholders (`000000...`) in production.
- **Purpose:** Encrypts social media OAuth access tokens, refresh tokens, and webhook secrets at rest in MongoDB.

#### `CRON_SECRET`
- **Required:** **Yes** (in production)
- **Secret:** **Yes**
- **Format:** Random high-entropy token (generate with `openssl rand -hex 24`).
- **Purpose:** Secures the background scheduler trigger endpoint `/api/v1/scheduler/run` against unauthorized access.

---

### C. Cloudflare R2 Media Storage Variables (Render API)

#### `MEDIA_STORAGE_PROVIDER`
- **Required:** **Yes**
- **Values:** `r2` (production) | `local` (offline local development)

#### `R2_ACCOUNT_ID`
- **Required:** **Yes** (when `MEDIA_STORAGE_PROVIDER=r2`)
- **Format:** 32-character hexadecimal Cloudflare account identifier.

#### `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY`
- **Required:** **Yes** (when `MEDIA_STORAGE_PROVIDER=r2`)
- **Secret:** **Yes**
- **Purpose:** S3-compatible credentials generated in Cloudflare R2 -> Manage R2 API Tokens.

#### `R2_BUCKET_NAME`
- **Required:** **Yes** (when `MEDIA_STORAGE_PROVIDER=r2`)
- **Format:** Lowercase bucket name (e.g. `market-aura-media-prod`).

#### `R2_ENDPOINT`
- **Required:** No (Optional custom endpoint override)
- **Default:** Automatically derived as `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.

#### `R2_PUBLIC_BASE_URL` (Canonical) & `R2_PUBLIC_URL` (Alias)
- **Required:** **Yes** (when `MEDIA_STORAGE_PROVIDER=r2`)
- **Format:** `https://media.marketaura4u.com` or `https://pub-<hash>.r2.dev` (must start with `https://`).
- **Purpose:** Public HTTPS base domain for serving media. Meta Instagram and Facebook Graph APIs require public HTTPS URLs to ingest media during automated publishing.

#### Media Safeguard & Billing Limits:
- `MEDIA_UPLOADS_ENABLED`: Set to `false` to disable uploads administratively (Default: `true`).
- `MEDIA_MAX_UPLOAD_BYTES`: Maximum size per uploaded asset in bytes (Default: `10485760` = 10 MiB).
- `MEDIA_USER_STORAGE_QUOTA_BYTES`: Maximum aggregate storage per user in bytes (Default: `104857600` = 100 MiB).
- `MEDIA_USER_MONTHLY_UPLOAD_LIMIT`: Maximum upload operations per user per calendar month (Default: `100`).

---

### D. AI & External Integration Variables (Render API)

#### `GROQ_API_KEY`
- **Required:** **Yes**
- **Secret:** **Yes**
- **Format:** `gsk_...`
- **Purpose:** Authenticates requests to Groq Cloud for fast LLM inference.

#### `GROQ_MODEL`
- **Required:** No (Default: `openai/gpt-oss-20b`)
- **Supported Options:** `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`.

#### `CHECKOUT_ENABLED`
- **Required:** No (Default: `true`)
- **Purpose:** Feature gate for Razorpay billing endpoints. If set to `false`, `/api/v1/payments` returns HTTP 403 `FEATURE_DISABLED`.

#### `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- **Required:** **Yes** (if `CHECKOUT_ENABLED=true`)
- **Secret:** `RAZORPAY_KEY_SECRET` is **Secret**.
- **Format:** `rzp_test_...` (development) or `rzp_live_...` (production).
- **Purpose:** Razorpay order creation and HMAC-SHA256 signature verification.

#### `META_UNIFIED_CONFIG_ID`
- **Required:** **Yes** (in production for Instagram/Facebook integration)
- **Format:** Numeric Configuration ID from Meta Developer Portal (e.g. `1128283246795449`).
- **Purpose:** Activates Meta Unified Login flow for cross-platform Instagram and Facebook authorization.

#### `FACEBOOK_APP_ID` & `FACEBOOK_APP_SECRET`
- **Required:** **Yes** (for Meta OAuth)
- **Secret:** `FACEBOOK_APP_SECRET` is **Secret**.

#### `INSTAGRAM_APP_ID` & `INSTAGRAM_APP_SECRET`
- **Required:** **Yes** (or inherits from Facebook credentials in Unified mode).

#### `TWITTER_CLIENT_ID` & `TWITTER_CLIENT_SECRET`
- **Required:** Optional (for Twitter / X OAuth 2.0 PKCE integration).

#### `LINKEDIN_CLIENT_ID` & `LINKEDIN_CLIENT_SECRET`
- **Required:** Optional (for LinkedIn OAuth 2.0 integration).

---

### E. Python Machine Learning Service Variables (`CAPSTONE`)

> [!IMPORTANT]
> The Python ML recommender was excluded from the initial Render Free tier deployment due to memory limits (512MiB plan vs ~1GB required by PyTorch and SentenceTransformers). The Express API operates with automatic graceful fallback when `RECOMMENDER_URL` is unset or offline.

#### `RECOMMENDER_URL`
- **Format:** `http://localhost:8001/recommend` (local) or internal microservice URL.
- **Default:** `http://localhost:8001/recommend`

#### `RECOMMENDER_HEALTH_URL`
- **Format:** `http://localhost:8001/health`

#### `RECOMMENDER_AUTH_MODE`
- **Values:** `none` (for loopback / Docker network) | `cloud-run` (for GCP OIDC tokens).

#### `HF_HUB_OFFLINE`
- **Value:** `1`
- **Purpose:** Enforces offline model inference using pre-baked weights inside the Docker image.
