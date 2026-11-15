# Market Aura 4U — Post-Deployment Verification Checklist

Follow this systematic verification protocol immediately after deploying the frontend to Vercel and the backend to Render. Execute tests in order to validate all platform subsystems without publishing unapproved social posts or initiating live financial charges.

---

## Pre-Flight Verification Checklist

```
[ ] 1. Frontend Vercel URL is live (HTTP 200)
[ ] 2. Backend Render API /health returns HTTP 200 {"status":"ok"}
[ ] 3. Backend Render API /ready returns HTTP 200 {"status":"ready"}
[ ] 4. Cloudflare R2 public domain is reachable over HTTPS
[ ] 5. MongoDB Atlas cluster status is healthy
[ ] 6. Meta Developer App valid redirect URIs match production Render URL
```

---

## 1. Health & Infrastructure Verification

### A. Backend Health Probes
Execute using terminal or browser:
```bash
# 1. Basic Liveness Check
curl -i https://<market-aura-api>.onrender.com/health
# Expected: HTTP 200 OK -> {"status":"ok","timestamp":"..."}

# 2. Database Readiness Check
curl -i https://<market-aura-api>.onrender.com/ready
# Expected: HTTP 200 OK -> {"status":"ready"}
```
*If `/ready` returns HTTP 503 `{"status":"not_ready","dependencies":{"database":"unavailable"}}`, verify that `MONGO_URI` is correctly set and MongoDB Atlas Network Access allows `0.0.0.0/0`.*

### B. Security & CORS Validation
Verify that the backend actively rejects unauthorized origins:
```bash
# Test CORS rejection for an unauthorized origin
curl -i -X OPTIONS https://<market-aura-api>.onrender.com/api/v1/auth/login \
  -H "Origin: https://malicious-site.example.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: HTTP 403 Forbidden -> {"success":false,"code":"ORIGIN_NOT_ALLOWED"}

# Test CORS acceptance for your Vercel frontend origin
curl -i -X OPTIONS https://<market-aura-api>.onrender.com/api/v1/auth/login \
  -H "Origin: https://<market-aura-project>.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Expected: HTTP 204 or 200 with Access-Control-Allow-Origin: https://<market-aura-project>.vercel.app
```

---

## 2. Authentication & Session Flow

1. **User Registration:**
   - Navigate to `https://<market-aura-project>.vercel.app/signup`.
   - Register a new test account (`test-deploy@marketaura4u.com` with a strong password).
   - Verify immediate redirect to `/onboarding`.
2. **Session Persistence:**
   - Open browser DevTools -> Application -> Local Storage.
   - Confirm key `market-aura-auth-token` is populated with a valid JWT string.
   - Refresh the page (`Cmd+R` / `F5`). Confirm you remain on the onboarding screen without being kicked to `/login`.
3. **Logout & Login:**
   - Log out via the profile menu.
   - Verify `market-aura-auth-token` is cleared from Local Storage.
   - Log back in at `/login`. Confirm successful authentication.

---

## 3. Brand Onboarding Flow

1. Fill out the Onboarding Stepper:
   - **Company Name:** `Market Aura Test Brand`
   - **Industry:** `Technology / SaaS`
   - **Target Audience:** `Small business owners & social managers`
   - **Unique Value Proposition (UVP):** `AI-powered autonomous multi-platform social growth`
   - **Brand Voice / Tone:** `Professional, witty, engaging`
2. Submit the form.
3. Verify redirect to the main `/dashboard` (or `/create-content`).
4. In MongoDB Atlas, verify that the `users` document has updated with the structured `brandProfile`.

---

## 4. AI Content Generation Flow

1. Navigate to **Create Content** (`/create-content`).
2. Enter a prompt:
   - *"Announce our new feature launch for autumn 2026 with a bold, exciting tone."*
3. Select platforms: **Instagram**, **Twitter**, **LinkedIn**.
4. Click **Generate Content**.
5. **Verify Generation Response:**
   - Content cards render for each requested platform with appropriate platform character counts and hashtags.
   - If the Python recommendation service (`market-aura-ml`) is running, check that `isGrounded: true` is populated with recommended topics and best posting times.
   - If the ML service is sleeping or offline, verify that the frontend displays the content seamlessly with graceful ungrounded fallback (`isGrounded: false`).

---

## 5. Media Upload & Cloudflare R2 Storage Verification

1. Navigate to **Media Library** (`/media-library`).
2. Upload a test image (`.jpg` or `.png`, < 10 MB).
3. **Verify Upload Ingestion:**
   - File appears in the Media Library grid.
   - Click the image to inspect its source URL.
   - The URL must point to your Cloudflare R2 public base domain:
     `https://<media.marketaura4u.com-or-pub-hash.r2.dev>/media/...`
4. **Verify Direct Browser Fetch:**
   - Copy the public media URL and open it in a private browser window.
   - The image must load directly over HTTPS without prompting for authentication or returning HTTP 403.
5. In Cloudflare Dashboard -> R2 -> `market-aura-media-prod`, confirm the object exists under the `media/<userId>/` prefix.

---

## 6. Social Accounts OAuth Connection

1. Navigate to **Social Accounts** (`/social-accounts`).
2. **Test Meta / Instagram Connect:**
   - Click **Connect Instagram**.
   - Confirm browser redirects to `https://www.facebook.com/v21.0/dialog/oauth` with your `client_id` (`FACEBOOK_APP_ID`) and the canonical redirect URI:
     `https://<market-aura-api>.onrender.com/api/v1/auth/social/instagram/callback`.
   - Log in with your authorized Meta test account and grant permissions.
   - Confirm redirection back to `https://<market-aura-project>.vercel.app/social-accounts?connected=instagram`.
   - Confirm Instagram card updates to **Connected** status.
3. **Verify Database Security:**
   - In MongoDB Atlas -> `socialaccounts` collection, inspect the created record.
   - Confirm `accessTokenEnc` is encrypted using AES-256-GCM (`iv.tag.ciphertext`). Plaintext tokens must never appear in database documents.

---

## 7. Scheduling & Scheduler Runner Verification

1. In **Create Content**, generate or compose a test post.
2. Click **Schedule Post** and set a publication time 10 minutes in the future.
3. Confirm the post appears in **Scheduled Posts** (`/scheduled-posts`) with status `scheduled`.
4. **Trigger Scheduler Manually:**
   - Execute the external trigger endpoint using your `CRON_SECRET`:
     ```bash
     curl -i -X POST https://<market-aura-api>.onrender.com/api/v1/scheduler/run \
       -H "Authorization: Bearer <CRON_SECRET>"
     ```
   - Verify HTTP 200 OK response:
     ```json
     {"success":true,"message":"Processed 0 due post(s).","processedCount":0,"timestamp":"..."}
     ```
5. *Note: The post will not publish until its scheduled time is reached. When the time arrives, the in-process worker (or next cron execution) claims the job atomically.*

---

## 8. Razorpay Payment Integration (Test Mode)

1. Navigate to **Billing & Plans** (`/billing`).
2. Select a subscription tier or credit pack.
3. Confirm Razorpay checkout modal opens displaying `rzp_test_...` key.
4. Complete test checkout using Razorpay standard test cards (e.g. `4000 0000 0000 0002`).
5. Confirm successful transaction confirmation and updated credit balance.

---

## 9. Delivery Outcome Uncertainty & Review UI

1. Navigate to **Delivery Review** (`/delivery-review`).
2. Verify page loads cleanly with empty state if no failures have occurred.
3. If any transient provider network failure ever leaves a publishing attempt uncertain, confirm it surfaces here with **Mark as Resolved** and **Retry** action controls.

---

## Verification Protocol Completion

Once all 9 sections pass successfully, your production deployment is verified and operational!
