# Market Aura 4U — Security Architecture & Threat Defense Model

This document outlines the security architecture, threat model, cryptographic controls, input validation boundaries, and compliance safeguards implemented in **Market Aura 4U**.

---

## 1. Threat Defense Model Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED INTERNET TRAFFIC                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. NETWORK & TRANSPORT DEFENSE                                         │
│    - Strict HTTPS Origin Enforcement (CORS whitelist, no wildcards)    │
│    - Anti-Spoofing Socket-Level IP Resolution (direct / trusted-cidrs) │
│    - Express trust proxy disabled by default                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. IN-MEMORY RATE LIMITING & DOS MITIGATION                            │
│    - Source IP token bucket (AUTH_MAX_IP_ATTEMPTS: 30 / 15m)           │
│    - Account brute-force defense (AUTH_MAX_ACCOUNT_ATTEMPTS: 10 / 15m) │
│    - Bcrypt thread pool concurrency cap (AUTH_MAX_CONCURRENT: 4)       │
│    - Key tracking bounds (AUTH_MAX_TRACKED_KEYS: 10,000)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. INPUT VALIDATION & BUFFER SANITIZATION                              │
│    - Strict JSON payload schemas (extra/unknown properties rejected)   │
│    - Bcrypt 72-byte password boundary protection                       │
│    - Binary magic bytes inspection (JPEG, PNG, WebP, GIF, MP4)         │
│    - SSRF prevention (private IPv4/IPv6 & loopback address blocking)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. ACCESS CONTROL & DATA PROTECTION AT REST                            │
│    - Dual-mode JWT + HTTP-Only, Secure, SameSite=Strict cookies        │
│    - Workspace isolation via isOnboarded middleware                    │
│    - AES-256-GCM authenticated encryption for OAuth tokens & secrets   │
│    - Constant-time HMAC SHA256 validation for Razorpay signatures      │
│    - Database projections: encrypted tokens select:false & toJSON wipe │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cryptographic Controls

### 2.1. Social Token Vault (AES-256-GCM)
All third-party access tokens, refresh tokens, and webhook secrets are encrypted before persisting to MongoDB (`src/utils/tokenCrypto.js`).
- **Algorithm:** AES-256 in Galois/Counter Mode (`aes-256-gcm`).
- **Key Derivation:** Sourced from `TOKEN_ENCRYPTION_KEY` (32 bytes / 64 hex characters). In production, an insecure placeholder (such as 64 zeros) throws a fatal startup exception.
- **Random Nonces:** A fresh, cryptographically secure 12-byte initialization vector (`crypto.randomBytes(12)`) is generated for each operation.
- **Integrity Tag:** A 16-byte GCM authentication tag protects against tampering.
- **Storage Format:** Stored as `${iv}.${authTag}.${ciphertext}` (all base64url encoded).
- **Tamper Resistance:** Any bit manipulation causes `createDecipheriv` to throw; the utility intercepts the error and returns `null` safely, preventing padding-oracle attacks.

### 2.2. Password Hashing & Bcrypt Boundaries
- **Algorithm:** `bcrypt` with 10 salt rounds.
- **The 72-Byte Boundary Vulnerability:** The underlying `bcrypt` algorithm silently ignores all bytes beyond the first 72. To prevent silent password truncation vulnerabilities where `password123...[extra]` matches `password123`, registration strictly validates:
  ```javascript
  Buffer.byteLength(password, 'utf8') <= 72
  ```
  Passwords exceeding 72 UTF-8 bytes are rejected with HTTP 400 `INVALID_AUTH_INPUT`.
- **Login Boundary:** Login accepts up to 4096 UTF-8 bytes to retain backward compatibility with short or historically truncated passwords while preventing DoS attacks on the thread pool.

### 2.3. Constant-Time Verification for Payments
Razorpay payment signatures (`POST /api/v1/payments/verify`) are validated using `crypto.timingSafeEqual`:
```javascript
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${orderCreationId}|${razorpayPaymentId}`)
  .digest('hex');

const isMatch = crypto.timingSafeEqual(
  Buffer.from(expectedSignature, 'utf8'),
  Buffer.from(razorpaySignature, 'utf8')
);
```
This guarantees constant execution time, preventing timing-channel attacks.

---

## 3. Server-Side Request Forgery (SSRF) Defenses

When users provide media URLs or webhook destinations, malicious inputs could target internal cloud services (e.g. AWS/GCP instance metadata services at `169.254.169.254` or internal microservices at `localhost`).

The `validatePublicHttpUrl()` utility (`src/utils/tokenCrypto.js`) enforces strict SSRF protections:
1. **Protocol Restrictions:** Requires `https:` (allows `http:` only during local development).
2. **Credential Blocking:** Rejects URLs containing usernames or passwords (`user:pass@host`).
3. **Private IP & Hostname Rejection (`isPrivateOrLoopbackHost`):**
   - Blocks loopback hosts: `localhost`, `.local`, `.internal`.
   - Blocks IPv4 private subnets: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (link-local), `100.64.0.0/10` (CGNAT).
   - Blocks IPv6 private ranges: `::1`, `fe80::/10` (link-local), `fc00::/7` (unique local), and IPv4-mapped IPv6 addresses (`::ffff:10.x.x.x`).

---

## 4. Input Validation & Binary Inspection

1. **Payload Strictness:**
   - Auth endpoints (`/signup`, `/login`) reject extra properties, arrays, or non-string inputs.
   - Onboarding (`/onboarding`) accepts strictly the 6 defined fields, capped at 5000 characters each.
   - AI generation (`/generate`) accepts strictly `{ prompt }` (5 to 5000 characters).
2. **Binary Magic Bytes Inspection:**
   - Media uploads do not rely solely on client-declared MIME types or file extensions.
   - The buffer header is inspected for true binary magic bytes (`matchesMagicBytes()` in `src/controllers/media/mediaController.js`):
     - JPEG: `0xFF, 0xD8, 0xFF`
     - PNG: `0x89, 0x50, 0x4E, 0x47`
     - GIF: `GIF87a` or `GIF89a`
     - WebP: `RIFF....WEBP`
     - MP4: `....ftyp`
   - Files with mismatched signatures are rejected with HTTP 400.

---

## 5. Network & CORS Hardening

- **CORS Origin Matching:**
  - Implemented in `src/config/cors.js` and `src/middleware/cors.js`.
  - Rejects browser requests if the `Origin` header does not match `CORS_ALLOWED_ORIGINS` exactly.
  - Rejections return HTTP 403 `ORIGIN_NOT_ALLOWED` with **zero** `Access-Control-Allow-Origin` or `Access-Control-Allow-Credentials` headers.
  - In `production`, origins without `https:` are rejected at server startup.
- **Anti-Spoofing Proxy Strategy:**
  - Express `trust proxy` is disabled by default.
  - In `direct` mode, forwarding headers (`X-Forwarded-For`, `Forwarded`, `X-Real-IP`) are ignored to prevent attackers from rotating rate-limiting quotas.
  - In `trusted-cidrs` mode, the chain is evaluated strictly right-to-left through known CIDRs, stopping at the nearest untrusted boundary.

---

## 6. Data Redaction & Privacy

1. **Database Schema Redactions:**
   - `SocialAccount.js`: Tokens (`encryptedAccessToken`, `encryptedRefreshToken`) have `select: false`.
   - `toJSON` transform automatically strips `_id`, `__v`, `encryptedAccessToken`, and `encryptedRefreshToken`.
   - `MediaAsset.js`: `toJSON` transform automatically strips internal `storageKey` to prevent exposing bucket hierarchy.
   - `ScheduledPost.js`: `toJSON` transform strips internal lock leasing properties (`lockUntil`, `lockedBy`).
2. **Error Logging Hygiene:**
   - Upstream LLM and payment errors are logged with sanitized diagnostic structures.
   - Client prompts and provider responses containing user data are not dumped to public logs.

---

## 7. Secret Management & Repository Hygiene

- **Automated Pre-Flight Gate (`verify-deployment.js`):**
  - Scans example files (`.env.example`, `backend/.env.example`, `frontend/.env.example`) using regular expressions matching common key formats (`AIzaSy...`, `rzp_live_...`, `sk-ant-...`).
  - Blocks deployment if live credentials or API keys are detected.
- **Fail-Fast Production Validation:**
  - `JWT_SECREAT_KEY` / `JWT_SECRET_KEY`: Throws error on startup if missing in production.
  - `TOKEN_ENCRYPTION_KEY`: Throws error if missing or if set to the default placeholder in production.
  - `CRON_SECRET`: Throws error on startup or returns 403 if unconfigured when invoking `/scheduler/run`.
  - `META_UNIFIED_CONFIG_ID`: Returns HTTP 500 if unconfigured in production when initiating Meta OAuth.
