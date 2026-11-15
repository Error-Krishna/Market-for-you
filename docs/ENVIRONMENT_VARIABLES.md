# Market Aura 4U — Environment Variables Specification

This document provides the definitive, centralized source of truth for all environment variables used in the Market Aura 4U platform across the Frontend (Vercel), Backend API (Render), Machine Learning Engine (Render/Docker), and Local Development.

---

## 1. Master Placement Matrix

| Environment Variable | Service | Vercel (Frontend) | Render API | Render ML | Local `.env` | Secret / Public | Required in Production |
|---|---|---|---|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend | **Yes** | No | No | Frontend | Public | **Yes** |
| `VITE_API_URL` | Frontend (Alias) | Optional | No | No | Frontend | Public | Optional (Alias) |
| `NODE_ENV` | Backend | No | **Yes** (`production`) | No | Backend | Public | **Yes** |
| `PORT` | Backend / ML | No | **Yes** (`10000`) | **Yes** (`8080`) | Backend (`8000`) | Public | **Yes** (Platform assigned) |
| `PUBLIC_BACKEND_URL` | Backend | No | **Yes** | No | Backend | Public | **Yes** |
| `FRONTEND_URL` | Backend | No | **Yes** | No | Backend | Public | **Yes** |
| `CORS_ALLOWED_ORIGINS` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Strict HTTPS) |
| `MONGO_URI` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** |
| `MONGO_MAX_POOL_SIZE` | Backend | No | **Yes** (`20`) | No | Backend | Public | No (Default: 20) |
| `JWT_SECREAT_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (Canonical) |
| `JWT_SECRET_KEY` | Backend (Alias) | No | Optional | No | Backend | **Secret** | Optional (Alias) |
| `TOKEN_ENCRYPTION_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (32-byte hex) |
| `CRON_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (For `/scheduler/run`) |
| `AUTH_PROXY_MODE` | Backend | No | **Yes** (`direct`) | No | Backend | Public | No (Default: direct) |
| `AUTH_TRUSTED_PROXY_CIDRS`| Backend | No | Optional | No | Backend | Public | No (Only if proxy mode) |
| `GROQ_API_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** |
| `GROQ_MODEL` | Backend | No | **Yes** | No | Backend | Public | No (Default: `openai/gpt-oss-20b`) |
| `GROQ_MAX_OUTPUT_TOKENS` | Backend | No | Optional | No | Backend | Public | No (Default: 1536) |
| `GROQ_TIMEOUT_MS` | Backend | No | Optional | No | Backend | Public | No (Default: 45000) |
| `MEDIA_STORAGE_PROVIDER` | Backend | No | **Yes** (`r2`) | No | Backend | Public | **Yes** (`r2` for prod) |
| `R2_ACCOUNT_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (if R2) |
| `R2_ACCESS_KEY_ID` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (if R2) |
| `R2_SECRET_ACCESS_KEY` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (if R2) |
| `R2_BUCKET_NAME` | Backend | No | **Yes** | No | Backend | Public | **Yes** (if R2) |
| `R2_ENDPOINT` | Backend | No | Optional | No | Backend | Public | No (Derived automatically) |
| `R2_PUBLIC_BASE_URL` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Public HTTPS domain) |
| `R2_REGION` | Backend | No | Optional (`auto`) | No | Backend | Public | No (Default: `auto`) |
| `MEDIA_STORAGE_PREFIX` | Backend | No | Optional (`media`)| No | Backend | Public | No (Default: `media`) |
| `MEDIA_UPLOADS_ENABLED` | Backend | No | Optional (`true`) | No | Backend | Public | No (Default: `true`) |
| `MEDIA_MAX_UPLOAD_BYTES`| Backend | No | Optional | No | Backend | Public | No (Default: 10485760 = 10MB) |
| `MEDIA_USER_STORAGE_QUOTA_BYTES` | Backend | No | Optional | No | Backend | Public | No (Default: 104857600 = 100MB) |
| `MEDIA_USER_MONTHLY_UPLOAD_LIMIT` | Backend | No | Optional | No | Backend | Public | No (Default: 100) |
| `RECOMMENDER_URL` | Backend | No | **Yes** | No | Backend | Public | No (Defaults to local/fallback) |
| `RECOMMENDER_HEALTH_URL` | Backend | No | **Yes** | No | Backend | Public | No (Defaults to `/health`) |
| `RECOMMENDER_AUTH_MODE` | Backend | No | **Yes** (`none`) | No | Backend | Public | No (none for Render internal) |
| `RECOMMENDER_TIMEOUT_MS` | Backend | No | Optional (`30000`)| No | Backend | Public | No (Default: 15000 / 30000) |
| `RECOMMENDER_AUDIENCE` | Backend | No | Optional | No | Backend | Public | No (Only for GCP Cloud Run) |
| `CHECKOUT_ENABLED` | Backend | No | **Yes** (`true`) | No | Backend | Public | No (Default: `true`) |
| `RAZORPAY_KEY_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (for checkout) |
| `RAZORPAY_KEY_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (for checkout) |
| `FACEBOOK_APP_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (for Meta OAuth) |
| `FACEBOOK_APP_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (for Meta OAuth) |
| `FACEBOOK_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | No (Derived from Backend URL) |
| `INSTAGRAM_APP_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (for Instagram OAuth) |
| `INSTAGRAM_APP_SECRET` | Backend | No | **Yes** | No | Backend | **Secret** | **Yes** (for Instagram OAuth) |
| `INSTAGRAM_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | No (Derived from Backend URL) |
| `META_UNIFIED_CONFIG_ID` | Backend | No | **Yes** | No | Backend | Public | **Yes** (Meta Unified Login) |
| `TWITTER_CLIENT_ID` | Backend | No | Optional | No | Backend | Public | Optional (Twitter OAuth) |
| `TWITTER_CLIENT_SECRET` | Backend | No | Optional | No | Backend | **Secret** | Optional (Twitter OAuth) |
| `TWITTER_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | Optional |
| `LINKEDIN_CLIENT_ID` | Backend | No | Optional | No | Backend | Public | Optional (LinkedIn OAuth) |
| `LINKEDIN_CLIENT_SECRET` | Backend | No | Optional | No | Backend | **Secret** | Optional (LinkedIn OAuth) |
| `LINKEDIN_REDIRECT_URI` | Backend | No | Optional | No | Backend | Public | Optional |
| `RECOMMENDER_HOST` | ML Service | No | No | **Yes** (`0.0.0.0`)| ML Service | Public | No (Default: 0.0.0.0) |
| `HF_HUB_OFFLINE` | ML Service | No | No | **Yes** (`1`) | ML Service | Public | **Yes** (offline model inference) |

---

## 2. Detailed Variable Reference

### A. Frontend Variables (Configured on Vercel)

> [!WARNING]
> All `VITE_` variables are embedded into the client-side JavaScript bundle during the build step. They are visible to anyone inspecting network requests or bundle files. Never put passwords, database connection strings, JWT secrets, encryption keys, or third-party secret tokens in frontend environment variables.

#### `VITE_API_BASE_URL` (Recommended Standard)
- **Service:** React / Vite Frontend
- **Type:** Public URL
- **Required in Production:** Yes
- **Development Value:** `http://localhost:8000/api`
- **Production Value:** `https://<market-aura-api>.onrender.com/api`
- **Normalization Logic:** The client-side configuration automatically sanitizes this value:
  - If given `https://<api>.onrender.com`, it appends `/api`.
  - If given `https://<api>.onrender.com/api/v1`, it trims the `/v1` suffix because internal feature API modules already specify `/v1/...`.
  - Resolves cleanly to `https://<api>.onrender.com/api` in all configurations.

#### `VITE_API_URL` (Backward-Compatible Alias)
- **Service:** React / Vite Frontend
- **Type:** Public URL
- **Required in Production:** Optional (fallback for `VITE_API_BASE_URL`)

---

### B. Core Backend Variables (Configured on Render)

#### `NODE_ENV`
- **Required:** Yes
- **Value:** `production`
- **Purpose:** Enables production security behaviors, requires HTTPS in CORS origins, activates strict error handlers.

#### `PORT`
- **Required:** Yes (Render automatically injects `PORT=10000`)
- **Purpose:** Specifies the port Express listens on. The application binds to `0.0.0.0` across all interfaces.

#### `PUBLIC_BACKEND_URL`
- **Required:** Yes
- **Format:** `https://<market-aura-api>.onrender.com` (no trailing slash)
- **Purpose:** Canonical backend public address used to dynamically assemble OAuth redirect URIs and verify incoming callback hosts.

#### `FRONTEND_URL`
- **Required:** Yes
- **Format:** `https://<market-aura-project>.vercel.app` (no trailing slash)
- **Purpose:** The public destination URL where the backend redirects users after OAuth callbacks (e.g. `${FRONTEND_URL}/social-accounts?connected=instagram`).

#### `CORS_ALLOWED_ORIGINS`
- **Required:** Yes
- **Format:** Comma-separated list of exact HTTPS origins: `https://<market-aura-project>.vercel.app` (or with custom domains).
- **Validation Rules:**
  - Wildcards (`*`) are strictly prohibited and throw an error at startup.
  - In `production`, origins MUST use the `https:` protocol.
  - No trailing slashes or subpaths allowed.

#### `MONGO_URI`
- **Required:** Yes
- **Secret:** Yes
- **Format:** `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/market_aura?retryWrites=true&w=majority`
- **Purpose:** Primary database connection for users, companies, posts, jobs, media metadata, and scheduler state.

#### `MONGO_MAX_POOL_SIZE`
- **Required:** No (Default: `20`)
- **Format:** Positive integer (e.g. `20`)
- **Purpose:** Limits concurrent connections per backend instance to prevent exhausting MongoDB Atlas connection limits.

#### `JWT_SECREAT_KEY` (Canonical) & `JWT_SECRET_KEY` (Alias)
- **Required:** Yes (at least one must be provided)
- **Secret:** Yes
- **Format:** 64-character hexadecimal string or high-entropy string (generate with `openssl rand -hex 32`).
- **Purpose:** Signs and verifies user JSON Web Tokens. Backward compatibility accepts the legacy spelling `JWT_SECREAT_KEY` seamlessly.

#### `TOKEN_ENCRYPTION_KEY`
- **Required:** Yes
- **Secret:** Yes
- **Format:** 64-character hexadecimal string (representing exactly 32 bytes for AES-256-GCM).
- **Generator:** Run `openssl rand -hex 32` in terminal.
- **Validation Rules:** The backend startup security guard explicitly rejects dummy placeholders (such as all zeros) in production.
- **Purpose:** Encrypts user social media access tokens, refresh tokens, and webhook secrets at rest in MongoDB.

#### `CRON_SECRET`
- **Required:** Yes
- **Secret:** Yes
- **Format:** High-entropy secret string (generate with `openssl rand -hex 24`).
- **Purpose:** Secures the external scheduler trigger endpoint `POST /api/v1/scheduler/run`. Required for external cron jobs or uptime monitors to safely trigger due post publishing.

#### `AUTH_PROXY_MODE`
- **Required:** No (Default: `direct`)
- **Values:** `direct` | `trusted-cidrs`
- **Purpose:** Determines IP rate-limiting behavior. On Render web services, `direct` safely tracks client requests without trusting spoofed proxy headers.

---

### C. Cloudflare R2 Media Storage Variables (Render)

#### `MEDIA_STORAGE_PROVIDER`
- **Required:** Yes
- **Value:** `r2` (in production) | `local` (in offline development)
- **Purpose:** Dictates whether uploads are persisted to Cloudflare R2 or the local filesystem.

#### `R2_ACCOUNT_ID`
- **Required:** Yes (when provider is `r2`)
- **Format:** 32-character Cloudflare account hexadecimal ID.
- **Where to obtain:** Cloudflare Dashboard -> Overview -> Account ID (right sidebar).

#### `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY`
- **Required:** Yes (when provider is `r2`)
- **Secret:** Yes
- **Where to obtain:** Cloudflare Dashboard -> R2 -> Manage R2 API Tokens -> Create Token (Object Read & Write permissions).

#### `R2_BUCKET_NAME`
- **Required:** Yes (when provider is `r2`)
- **Format:** Bucket name (e.g. `market-aura-media-prod`).

#### `R2_ENDPOINT`
- **Required:** No (Optional override)
- **Default Behavior:** Automatically derived as `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
- **Validation:** Cleaned by `sanitizeR2Endpoint()` to ensure no trailing paths or slashes.

#### `R2_PUBLIC_BASE_URL`
- **Required:** Yes (when provider is `r2`)
- **Format:** `https://media.marketaura4u.com` or `https://pub-<hash>.r2.dev` (must start with `https://`).
- **Purpose:** Public HTTPS URL where uploaded images and videos are served. This is essential for Instagram and Facebook Graph APIs, which require public media endpoints to ingest content.

---

### D. AI and External Integration Variables (Render)

#### `GROQ_API_KEY`
- **Required:** Yes
- **Secret:** Yes
- **Format:** `gsk_...` (obtain from Groq Console).
- **Purpose:** Powers AI copy, caption, and hashtag generation.

#### `GROQ_MODEL`
- **Required:** No (Default: `openai/gpt-oss-20b`)
- **Supported Models:** `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`.

#### `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- **Required:** Yes (for subscription and credit checkouts)
- **Format:** `rzp_test_...` (development) or `rzp_live_...` (production).
- **Purpose:** Authenticates Razorpay order creation and HMAC-SHA256 signature verification.

#### `META_UNIFIED_CONFIG_ID`
- **Required:** Yes
- **Format:** Numeric configuration ID from Meta Developer Console (e.g. `1128283246795449`).
- **Purpose:** Powers Meta Unified Login for Facebook and Instagram integration.

#### `FACEBOOK_APP_ID` & `FACEBOOK_APP_SECRET`
- **Required:** Yes (for Meta integration)
- **Format:** Meta App ID and App Secret from Meta Developer Portal.

#### `INSTAGRAM_APP_ID` & `INSTAGRAM_APP_SECRET`
- **Required:** Yes (or uses Facebook credentials if unified)

---

### E. Python Recommendation Service Variables (Render ML)

#### `RECOMMENDER_URL` (Backend)
- **Format:** `http://market-aura-ml:8080/recommend` (using Render Private Networking) or public HTTPS URL.

#### `RECOMMENDER_HEALTH_URL` (Backend)
- **Format:** `http://market-aura-ml:8080/health`.

#### `RECOMMENDER_AUTH_MODE` (Backend)
- **Value:** `none` (for Render private network service-to-service communication) | `cloud-run` (for GCP).

#### `RECOMMENDER_TIMEOUT_MS` (Backend)
- **Value:** `30000` (allows 30 seconds for ML model inference and cold starts).

#### `HF_HUB_OFFLINE` (ML Service)
- **Value:** `1`
- **Purpose:** Enforces offline operation using weights pre-cached inside the container during build time.
