# Market Aura 4U — Vercel Frontend Deployment Guide

This guide details the procedure for deploying the Market Aura 4U React 19 / Vite single-page application (SPA) on Vercel as an independent, high-performance static frontend.

---

## 1. Architectural Role & Responsibilities

The Vercel deployment acts as the primary public entry point for users:
- **Public URL:** `https://<market-aura-project>.vercel.app` (or custom apex domain).
- **Static Assets:** Optimized JavaScript, CSS, SVGs, and fonts served across Vercel's global Edge CDN.
- **Client Routing:** React Router v7 SPA with fallback rewrites to `/index.html`.
- **Backend Communication:** Centralized Axios client calling the Render API over HTTPS with JSON Web Tokens and CORS credentials.

> [!IMPORTANT]
> The Express backend, database operations, media uploads, and scheduler execution run exclusively on Render. Do not deploy the backend on Vercel or configure Vercel Serverless Functions for API handling.

---

## 2. Platform Plan & Commercial Use Compliance

Market Aura 4U is a commercial SaaS application featuring paid credit tiers and subscription checkout.

- **Vercel Hobby Plan:** Free of charge, intended exclusively for personal, non-commercial projects and evaluation. Hobby plans have execution limits and strictly prohibit commercial SaaS operations under Vercel's Terms of Service.
- **Vercel Pro Plan ($20/seat/month):** Required by Vercel for commercial SaaS products, custom team access, and business production workloads.
- **Evaluation / Demo Mode:** You may deploy to Vercel Hobby during initial testing and demo phases before accepting commercial customer payments.

---

## 3. Project Configuration Options

There are two valid ways to connect the GitHub repository on Vercel. **Option A (Frontend Directory Root) is strongly recommended.**

### Option A (Recommended): Frontend Root Directory

Set the Vercel project **Root Directory** to `market-aura-4u-frontend-main`.

| Setting | Value | Notes |
|---|---|---|
| **Framework Preset** | `Vite` | Auto-detected by Vercel |
| **Root Directory** | `market-aura-4u-frontend-main` | Isolates frontend package & lockfile |
| **Build Command** | `npm run build` | Executes `tsc -b && vite build` |
| **Output Directory** | `dist` | Generated build bundle |
| **Install Command** | `npm install` | Uses `market-aura-4u-frontend-main/package-lock.json` |
| **Node.js Version** | `20.x` or `22.x` | Set in Project Settings -> General |

### Option B (Alternative): Monorepo Root Directory

If you leave the Root Directory as repository root (`.`):

| Setting | Value | Notes |
|---|---|---|
| **Framework Preset** | `Vite` | Or Other |
| **Root Directory** | `.` | Monorepo root |
| **Build Command** | `npm run build` | Root script builds `market-aura-4u-frontend-main` |
| **Output Directory** | `market-aura-4u-frontend-main/dist` | Points to subfolder build output |
| **Install Command** | `npm install` | Installs root dependencies |

---

## 4. Step-by-Step Vercel Dashboard Deployment

### Step 1: Import Repository
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your Git provider (GitHub) and click **Import** next to your Market Aura 4U repository.

### Step 2: Configure Project Settings
1. **Project Name:** `market-aura-4u` (or your preferred project slug).
2. **Framework Preset:** Select `Vite`.
3. **Root Directory:** Click **Edit** and choose `market-aura-4u-frontend-main`.
4. Leave **Build Command** and **Output Directory** toggled to default (`npm run build` and `dist`).

### Step 3: Add Environment Variables
In the **Environment Variables** section, add:

| Key | Value | Environment |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<market-aura-api>.onrender.com/api` | Production, Preview, Development |
| `VITE_API_URL` (Optional) | `https://<market-aura-api>.onrender.com/api` | Production, Preview, Development |

> [!TIP]
> The frontend normalizer automatically accepts `https://<api>.onrender.com`, `https://<api>.onrender.com/api`, or `https://<api>.onrender.com/api/v1` and standardizes them to the correct base route.

### Step 4: Deploy
1. Click **Deploy**.
2. Wait approximately 30–60 seconds while Vercel runs TypeScript type-checking and the Vite production build.
3. Once finished, Vercel presents your public domain: `https://<market-aura-project>.vercel.app`.

---

## 5. Routing, Caching & Security Headers (`vercel.json`)

The frontend repository includes `market-aura-4u-frontend-main/vercel.json` pre-configured with industry-standard headers:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Pragma",
          "value": "no-cache"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Key Behaviors:
- **Hashed Assets (`/assets/*`):** Cached immutably for 1 year to maximize CDN efficiency.
- **Application Shell (`/index.html`):** Configured with `no-cache` so users immediately receive new releases upon refresh.
- **SPA Rewrites:** All deep routes (e.g. `/social-accounts`, `/create-content`, `/settings`) rewrite to `/index.html`, eliminating 404 errors on direct navigation or page refresh.

---

## 6. Post-Deployment Verification

1. **Verify Asset Loading:** Open the Vercel URL in your browser. Inspect Network devtools to ensure assets return HTTP 200 with appropriate Cache-Control headers.
2. **Verify SPA Refresh:** Navigate to `/login` or `/signup` and hard-refresh the page (`Cmd+Shift+R` / `Ctrl+F5`). The route must render without a 404 error.
3. **Connect with Render API:** Ensure your Render backend has added your exact Vercel domain to `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL`.
