# Market Aura 4U — Cloudflare R2 Media Storage Setup Guide

This guide details the end-to-end setup of Cloudflare R2 object storage for Market Aura 4U media uploads, asset management, and Meta Graph API social publishing.

---

## 1. Why Cloudflare R2?

Market Aura 4U uses Cloudflare R2 as its primary production media storage provider for three key architectural reasons:
1. **Zero Egress Fees:** Unlike AWS S3, Cloudflare R2 charges \$0 for data egress, preventing surprise bills when Meta or users download images and videos.
2. **S3-Compatible API:** Fully compatible with `@aws-sdk/client-s3` v3, providing high performance and reliable SDK integration.
3. **Public HTTPS Delivery:** Native custom domain and `r2.dev` support, which is strictly required by the Instagram and Facebook Graph APIs to ingest media during automated publishing.

---

## 2. Step-by-Step Cloudflare Dashboard Configuration

### Step 1: Enable R2 Object Storage
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. In the left navigation, click **R2**.
3. If this is your first time using R2, activate the service on your account (the free tier includes 10 GB of storage and 10 million Read operations per month).

### Step 2: Create a Storage Bucket
1. Click **Create Bucket**.
2. **Bucket Name:** `market-aura-media-prod` (or your preferred unique lowercase name).
3. **Location:** Leave as **Automatic** (or select a region close to your primary audience).
4. Click **Create Bucket**.

### Step 3: Configure Public Access (Mandatory for Meta Publishing)
The Meta Instagram and Facebook Graph APIs require media files to be publicly reachable via a stable, unauthenticated HTTPS URL.

Choose **Method A (Custom Domain)** or **Method B (Managed R2.dev)**:

#### Method A: Custom Domain (Recommended for Production)
1. Within your bucket, go to the **Settings** tab.
2. Under **Public Access**, click **Connect Domain**.
3. Enter your subdomain (e.g. `media.marketaura4u.com`).
4. Click **Continue** -> **Connect Domain**. Cloudflare automatically configures the SSL certificate and DNS record.
5. Your public base URL is: `https://media.marketaura4u.com`

#### Method B: R2.dev Managed Domain (Fastest for Staging/Demo)
1. Within your bucket, go to the **Settings** tab.
2. Under **R2.dev subdomain**, click **Allow Access**.
3. Type `allow` to confirm.
4. Cloudflare provides a public URL in the format: `https://pub-<unique-hash>.r2.dev`.
5. Your public base URL is: `https://pub-<unique-hash>.r2.dev`

> [!IMPORTANT]
> The value of `R2_PUBLIC_BASE_URL` must start with `https://` and must NOT contain a trailing slash.

### Step 4: Configure Bucket CORS Policy
To allow the frontend application to preview media or perform direct browser-based inspections, configure the bucket CORS policy:
1. Go to **Settings** -> **CORS Policy**.
2. Add the following JSON configuration:
   ```json
   [
     {
       "AllowedOrigins": [
         "https://<market-aura-project>.vercel.app",
         "http://localhost:5173",
         "http://localhost:3000"
       ],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. Click **Save**.

### Step 5: Generate API Token
1. In the R2 main menu (left sidebar), click **Manage R2 API Tokens**.
2. Click **Create API Token**.
3. **Token Name:** `market-aura-backend-prod`
4. **Permissions:** Select **Object Read & Write**.
5. **Bucket Scope:** Select **Specific bucket** and choose `market-aura-media-prod`.
6. Click **Create API Token**.
7. Copy the following credentials immediately (Cloudflare will not display the secret key again):
   - **Access Key ID:** Maps to `R2_ACCESS_KEY_ID`
   - **Secret Access Key:** Maps to `R2_SECRET_ACCESS_KEY`
   - **Endpoint:** Notice the account ID in the endpoint URL: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Maps to `R2_ACCOUNT_ID`.

---

## 3. Backend Environment Mapping (Render)

Add the following environment variables to your Render Backend Web Service:

```env
MEDIA_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=<your-32-char-account-id>
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_BUCKET_NAME=market-aura-media-prod
R2_PUBLIC_BASE_URL=https://media.marketaura4u.com
R2_REGION=auto
MEDIA_STORAGE_PREFIX=media
```

*Note: `R2_ENDPOINT` is optional. The application's `sanitizeR2Endpoint()` helper automatically constructs `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` when omitted.*

---

## 4. Application-Level Billing & Quota Safeguards

To prevent unexpected storage expansion and control infrastructure costs, Market Aura 4U enforces built-in application-level quota limits:

| Variable | Default Value | Purpose |
|---|---|---|
| `MEDIA_UPLOADS_ENABLED` | `true` | Master toggle to enable or disable new uploads instantly |
| `MEDIA_MAX_UPLOAD_BYTES` | `10485760` (10 MB) | Maximum size per uploaded media item |
| `MEDIA_USER_STORAGE_QUOTA_BYTES` | `104857600` (100 MB) | Maximum total storage allowed per user account |
| `MEDIA_USER_MONTHLY_UPLOAD_LIMIT` | `100` | Maximum number of upload operations per user per calendar month |

If a user exceeds their quota, the backend returns HTTP 400 with a clear explanatory error before transferring bytes to Cloudflare R2.

---

## 5. Local Development Fallback

For offline local development without Cloudflare R2 credentials, set:
```env
MEDIA_STORAGE_PROVIDER=local
```
The backend automatically falls back to storing uploads under `market-aura-4u-backend-main/uploads/media/` and serving them via `http://localhost:8000/uploads/media/:userId/:filename`.
