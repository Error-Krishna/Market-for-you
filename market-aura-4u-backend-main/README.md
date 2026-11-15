# Market Aura 4U — Backend REST API

The Node.js Express 5 REST API and background scheduler worker for **Market Aura 4U**, providing brand-grounded AI generation, multi-platform publishing, durable post scheduling, AES-256-GCM token encryption, and Cloudflare R2 media storage.

---

## Architecture & Technology Stack

- **Runtime:** Node.js 22 LTS (`>=20.0.0`, verified with `v22.23.5` in `.node-version`)
- **Web Framework:** Express 5 (`^5.1.0`)
- **Database:** MongoDB 7 / MongoDB Atlas via Mongoose 8 (`^8.19.2`)
- **Authentication:** JSON Web Tokens (`jsonwebtoken` `^9.0.2`), `bcrypt` (`^6.0.0`), `cookie-parser` (`^1.4.7`)
- **Object Storage:** Cloudflare R2 via AWS SDK v3 S3 client (`@aws-sdk/client-s3` `^3.1169.0`)
- **Social Media APIs:** `twitter-api-v2` (`^1.27.0`), Meta Graph API v21.0, LinkedIn REST API
- **AI Inference:** Groq Cloud Chat Completions (`openai/gpt-oss-20b`)
- **Payments:** Razorpay (`^2.9.6`)
- **HTTP Client:** Axios (`^1.13.2`) and native `fetch`
- **Testing:** Node.js built-in test runner (`node --test`)

---

## Directory Structure

```
market-aura-4u-backend-main/src/
├── app.js                         # Application entry point, CORS, payload limits, health checks
├── config/
│   ├── auth.js                    # Rate limiting thresholds & window configuration
│   ├── authProxy.js               # Client IP proxy resolution (direct / trusted-cidrs)
│   ├── cors.js                    # Origin validation & HTTPS enforcement
│   ├── db.js                      # MongoDB Atlas connection pool & timeout options
│   ├── generation.js              # Concurrency and timeout bounds for Groq AI
│   ├── recommender.js             # Recommender microservice configuration
│   └── urls.js                    # External platform endpoints
├── controllers/
│   ├── auth/                      # Signup, Login, Logout, Profile, Onboarding, Settings
│   ├── connectAccount/            # Multi-platform OAuth & credentials (socialConnectController.js)
│   ├── content/                   # Content generation (Groq), history, and direct publishing
│   ├── media/                     # Base64 parsing, magic byte checks, R2 storage, quotas
│   └── payments/                  # Razorpay order creation and HMAC-SHA256 signature verification
├── middleware/
│   ├── auth.js                    # Dual-mode JWT & cookie verification
│   ├── authAttempts.js            # Token bucket IP and account rate limiting
│   ├── cors.js                    # Origin whitelist filter
│   └── isOnboarded.js             # Workspace access gatekeeper
├── models/                        # Mongoose schemas (User, SocialAccount, ScheduledPost, MediaAsset, Job, OAuthState)
├── routes/
│   ├── index.js                   # Root router mounting /v1
│   └── v1/                        # Feature routers (auth, social, content, posts, media, scheduler, payments, settings)
├── services/
│   ├── publishers/                # Platform publishers (twitter, linkedin, instagram, facebook, email, blog)
│   ├── schedulerService.js        # In-process 15s scheduler, atomic MongoDB claims, outcome uncertainty handler
│   └── storage/                   # Cloudflare R2 and local filesystem storage abstraction
└── utils/                         # AES-256-GCM token crypto, SSRF validation, diagnostics, error normalizers
```

---

## Available Scripts

Run from `market-aura-4u-backend-main/` or via root `npm --prefix market-aura-4u-backend-main <script>`:

```bash
# Start backend API on http://localhost:8000
npm start

# Start development server with nodemon auto-reload
npm run dev

# Run CI test suite (492 tests across 31 test files)
npm run test:ci

# Run complete test suite
npm test

# Run isolated MVP journey test
npm run test:isolated-mvp
```

---

## Health Check Routes

- `GET /health`: Basic process health check. Returns `200 OK` `{ "status": "ok", "timestamp": "..." }`. (Does not test database).
- `GET /ready`: Deep database readiness probe. Checks `mongoose.connection.readyState === 1`. Returns `200 OK` `{ "status": "ready" }` or `503 Service Unavailable`.

---

## Environment Configuration

Copy `market-aura-4u-backend-main/.env.example` to `market-aura-4u-backend-main/.env`.

See the centralized documentation for exhaustive variable specifications:
- [docs/ENVIRONMENT_VARIABLES.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/ENVIRONMENT_VARIABLES.md)
- [docs/API_REFERENCE.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/API_REFERENCE.md)
- [docs/DEPLOYMENT.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/DEPLOYMENT.md)
