# MARKET AURA 4U — PRODUCTION DEPLOYMENT & OPERATIONS GUIDE

This guide provides end-to-end instructions for deploying **Market Aura 4U** into staging and production environments.

---

## 1. System Architecture & Topology

Market Aura 4U is structured into four decoupled, containerized tiers:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER / CDN                        │
│             React 19 / Vite 8 SPA (Nginx / Vercel)              │
│                Default Port: 3000 (Local) / 80 (Container)       │
└────────────────────────────────▲────────────────────────────────┘
                                 │ HTTPS / Same-Site Cookies
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API SERVICE                       │
│                   Express 5 / Node.js 22 LTS                    │
│                      Default Port: 8000                         │
│             Health: /health (200) | Ready: /ready (200/503)     │
└───────────────▲─────────────────────────────────┬───────────────┘
                │                                 │
     Private Mongo Protocol            Private HTTP / Service Token
                │                                 │
                ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│       DATABASE SERVICE        │ │     ML RECOMMENDER SERVICE    │
│     MongoDB 7 (Atlas / Box)   │ │  Python 3.11 / scikit-learn   │
│       Default Port: 27017     │ │      Default Port: 8080       │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Pre-Deployment Checklist

Before deploying, run the automated verification tool from the repository root:

```bash
node scripts/verify-deployment.js
```

Ensure all pre-flight checks pass:
- [x] All `Dockerfile` and container configurations present
- [x] Frontend production bundle builds cleanly (`market-aura-4u-frontend-main/dist/`)
- [x] ML input/output JSON contracts validated
- [x] No live credentials or API keys committed in example templates
- [x] All test suites passing (`npm run test:backend`, `npm run test:frontend`, `npm run test:ml`)

---

## 3. Deployment Option A: Docker Compose (Single Host / VPS / AWS EC2)

Ideal for staging, internal demos, self-hosted VPS (DigitalOcean Droplet, Linode, Hetzner, or AWS EC2).

### Step 1: Clone and Configure Environment

```bash
git clone <repository-url>
cd "Market Aura For you"

# Copy example environment configuration
cp .env.example .env
```

Edit `.env` and configure your secure values:
```bash
# Generate secure 64-char hex keys
node -e "console.log('JWT_SECREAT_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Build and Start Containers

```bash
# Build and launch all 4 services in the background
docker compose up -d --build

# View real-time container status and health
docker compose ps
```

### Step 3: Verify Health Endpoints

```bash
# 1. Frontend
curl -I http://localhost:3000/healthz

# 2. Backend Liveness
curl http://localhost:8000/health

# 3. Backend Database Readiness
curl http://localhost:8000/ready

# 4. ML Recommender Engine
curl http://localhost:8080/health
```

### Production Log Rotation & Resource Limits
For production workloads, activate the production overlay:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 4. Deployment Option B: Managed Cloud (Vercel + Render / Railway + MongoDB Atlas)

Recommended for scalable, serverless production deployments.

### 4.1 Frontend SPA (Vercel)
1. Import repository to Vercel.
2. Set **Root Directory**: `market-aura-4u-frontend-main`.
3. Set **Framework Preset**: `Vite`.
4. Configure Build & Output:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Environment Variables:
   - `VITE_API_URL`: `https://api.yourdomain.com/api`
6. `vercel.json` automatically configures SPA history-fallback and immutable asset caching headers.

### 4.2 Backend API (Render / Railway)
- **Runtime**: Node.js 22 LTS
- **Root Directory**: `market-aura-4u-backend-main`
- **Build Command**: `npm ci --omit=dev`
- **Start Command**: `node src/app.js`
- **Health Check Path**: `/health`
- **Key Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `8000` (or platform default)
  - `MONGO_URI`: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/market_aura?retryWrites=true&w=majority`
  - `JWT_SECREAT_KEY`: `<generated-hex-key>`
  - `TOKEN_ENCRYPTION_KEY`: `<generated-hex-key>`
  - `GROQ_API_KEY`: `<your-groq-key>`
  - `RECOMMENDER_URL`: `http://market-aura-ml:8080/recommend`
  - `RECOMMENDER_HEALTH_URL`: `http://market-aura-ml:8080/health`
  - `RECOMMENDER_AUTH_MODE`: `none` (or `cloud-run` for GCP)
  - `FRONTEND_URL`: `https://app.yourdomain.com`
  - `CORS_ALLOWED_ORIGINS`: `https://app.yourdomain.com`
  - `AUTH_PROXY_MODE`: `direct`

### 4.3 Python ML Recommender (Render / Railway Docker)
- **Runtime**: Docker (uses `CAPSTONE/Dockerfile`)
- **Docker Context**: `CAPSTONE`
- **Health Check Path**: `/health`
- **Port**: `8080`
- **Environment Variables**:
  - `PORT`: `8080`
  - `RECOMMENDER_HOST`: `0.0.0.0`
  - `HF_HUB_OFFLINE`: `1`

---

## 5. Deployment Option C: Render Blueprint (1-Click Monorepo)

The project includes an infrastructure-as-code blueprint: [`render.yaml`](render.yaml).

1. In Render dashboard, click **New > Blueprint**.
2. Connect your Git repository.
3. Render automatically provisions:
   - `market-aura-web` (Static Site)
   - `market-aura-api` (Express Node Web Service)
   - `market-aura-ml` (Docker ML Engine)
4. Provide your `MONGO_URI` and `GROQ_API_KEY` secrets when prompted.

---

## 6. Production Security & Cookie Configuration

Per Engineering Blueprint v2.0.0 (SEC-08, SEC-17):
1. **Same-Site Topology**: Host the frontend on `app.yourdomain.com` and backend API on `api.yourdomain.com` (sharing parent domain `.yourdomain.com`).
2. **Cookie Flags**:
   - `HttpOnly: true` (prevents JavaScript credential theft)
   - `Secure: true` (HTTPS required in production)
   - `SameSite: "Lax"` (preserves OAuth redirects while protecting against CSRF)
3. **No Secrets in Bundles**: Never prefix backend API keys, DB strings, or secrets with `VITE_`. Only `VITE_API_URL` and `VITE_RAZORPAY_KEY_ID` may be exposed to the client.

---

## 7. Database Backups & Recovery (Atlas)

1. Enable **Continuous Cloud Backups** with point-in-time recovery on MongoDB Atlas.
2. Ensure IP Access List allows only the backend API server IPs or VPC peering.
3. The database connection lifecycle uses `serverSelectionTimeoutMS: 5000` and reports degraded status via `GET /ready` if the replica set is temporarily unreachable.

---

## 8. Rollback Procedure

If a deployed release experiences an unexpected issue:
1. **Container / PaaS**: Re-deploy the previously tagged Docker image or Git commit SHA. No schema deletions are performed without an expand-contract deprecation period.
2. **Frontend Rollback**: In Vercel or Cloudflare Pages, instantly promote the previous deployment with 1 click.
3. **ML Rollback**: Revert the `RECOMMENDER_URL` or redeploy the prior `CAPSTONE` container revision.
