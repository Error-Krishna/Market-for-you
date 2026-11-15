# Market Aura 4U — Authentication, Authorization & Security Controls

This document details the complete authentication lifecycle, authorization middleware, session handling, rate limiting defenses, IP proxy validation, and token encryption mechanisms implemented in **Market Aura 4U**.

---

## 1. Authentication Architecture

Market Aura 4U implements a hardened, dual-mode authentication architecture:
1. **Bearer Token Authentication:** The client sends an `Authorization: Bearer <token>` header with every authenticated API request.
2. **HTTP-Only Cookies:** Upon successful login or registration, the backend sets an `httpOnly`, `sameSite: "strict"`, and `secure: true` (in production) cookie named `token` with a 24-hour expiration (`maxAge: 86400000`).
3. **Verification Priority:** The `auth.js` middleware inspects `req.cookies.token` first, and if not present, extracts the token from `req.headers.authorization`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser Client
    participant AuthMW as Auth Middleware
    participant Crypto as Token Crypto
    participant DB as MongoDB Atlas
    participant Route as Protected Route Handler

    Client->>AuthMW: Request with Authorization: Bearer <JWT>
    alt Token Missing
        AuthMW-->>Client: HTTP 401 "Access denied. No token provided."
    end

    AuthMW->>Crypto: jwt.verify(token, getJwtSecret())
    alt JWT Invalid or Expired
        AuthMW-->>Client: HTTP 401 "Invalid or expired token"
    end

    AuthMW->>DB: User.findOne({ email: decoded.email })
    alt Database Unavailable
        AuthMW-->>Client: HTTP 503 "Authentication is temporarily unavailable"
    else User Not Found
        AuthMW-->>Client: HTTP 401 "User not found"
    end

    AuthMW->>Route: req.user = user; next()
```

---

## 2. Password Security & Bcrypt Boundaries

- **Hashing Engine:** `bcrypt` with 10 salt rounds (`bcrypt.hash(password, 10)`).
- **Registration Length Boundaries:**
  - Minimum length: 8 JavaScript code units (matching frontend validation).
  - Maximum length: **72 UTF-8 bytes**.
  - *Architectural Rationale:* The underlying `bcrypt` algorithm truncates passwords after 72 bytes. To prevent silent truncation vulnerabilities where different long passwords match the same hash, the backend strictly rejects any new password exceeding 72 UTF-8 bytes with HTTP 400 `INVALID_AUTH_INPUT`.
- **Login Length Boundaries:**
  - Login accepts passwords up to 4096 UTF-8 bytes to retain backward compatibility with any historically truncated passwords while preventing Denial-of-Service (DoS) attacks on the bcrypt hashing thread pool.
- **Timing Attack Defense:** Invalid email and incorrect password responses return an identical generic error message (`"Invalid credentials"`), preventing user enumeration.

---

## 3. Account Onboarding & Workspace Access Control

Market Aura 4U enforces a strict two-stage account activation policy:
1. **Initial Registration:** The user account is created with `onboardingCompleted: false`.
2. **The `isOnboarded` Middleware:**
   - Mounted on all workspace, content generation, scheduling, and media routes.
   - If `user.onboardingCompleted` is `false`, the request is immediately rejected:
     ```json
     {
       "status": "fail",
       "message": "Workspace setup required.",
       "error_code": "WORKSPACE_LOCKED"
     }
     ```
   - Returns HTTP 403, signaling the frontend router (`OnboardingRoute.tsx`) to redirect the user to `/onboarding`.
3. **Onboarding Validation:**
   - `POST /api/v1/auth/onboarding` accepts strictly the six required fields: `companyName`, `industry`, `brandTone`, `uvp`, `targetAudience`, and `platforms`.
   - All text fields are capped at 5000 UTF-16 code units to prevent database bloating.
   - Upon successful validation, the brand profile is persisted and `onboardingCompleted` is set to `true`, unlocking all application features.

---

## 4. Rate Limiting & Denial-of-Service Defense

Authentication routes (`POST /api/v1/auth/signup` and `POST /api/v1/auth/login`) are protected by an in-memory, zero-dependency token bucket rate limiter (`src/utils/authLimiter.js` and `src/middleware/authAttempts.js`).

### 4.1. Limiting Tiers
1. **Client IP Rate Limiting:** Limits the total requests from a single client IP within a rolling window (`AUTH_MAX_IP_ATTEMPTS`, default: 30 requests per 15 minutes).
2. **Account Identifier Limiting:** Limits the total failed login attempts targeting a specific email address (`AUTH_MAX_ACCOUNT_ATTEMPTS`, default: 10 attempts per 15 minutes), mitigating credential-stuffing attacks.
3. **Concurrency Limiting:** Limits simultaneous bcrypt hashing operations per node process (`AUTH_MAX_CONCURRENT`, default: 4 concurrent jobs) to prevent CPU starvation.
4. **Registry Capacity Bounds:** In-memory tracking maps are capped at `AUTH_MAX_TRACKED_KEYS` (default: 10,000 keys) and automatically clean up expired buckets to prevent memory leaks.

### 4.2. Configuration Parameters
All limits are dynamically configurable via environment variables:
- `AUTH_WINDOW_MS`: Rolling window duration (default: `900000` = 15 minutes).
- `AUTH_MAX_IP_ATTEMPTS`: Max requests per IP per window (default: `30`).
- `AUTH_MAX_ACCOUNT_ATTEMPTS`: Max attempts per email per window (default: `10`).
- `AUTH_MAX_CONCURRENT`: Max concurrent bcrypt hashing threads (default: `4`).
- `AUTH_MAX_TRACKED_KEYS`: Maximum tracked IP/account keys in memory (default: `10000`).

---

## 5. Client IP Resolution & Proxy Hardening

In multi-tier cloud environments (e.g. Render, Vercel, Cloud Run), client requests pass through reverse proxies before reaching the Express application. Improper IP resolution allows attackers to spoof `X-Forwarded-For` headers and bypass rate limits.

### 5.1. Proxy Modes (`AUTH_PROXY_MODE`)
- **`direct` Mode (Default for Render):**
  - Express global `trust proxy` remains **disabled**.
  - All incoming forwarding headers (`X-Forwarded-For`, `Forwarded`, `X-Real-IP`) are strictly ignored.
  - The client identity is taken directly from the underlying TCP socket peer address (`req.socket.remoteAddress`).
  - *Security Benefit:* Attackers cannot forge forwarding headers to rotate rate-limiting quotas.
- **`trusted-cidrs` Mode:**
  - Used when the application sits behind an explicit, documented proxy infrastructure (e.g. AWS CloudFront or Cloudflare).
  - Configured via `AUTH_TRUSTED_PROXY_CIDRS` with up to 64 explicit IPv4/IPv6 subnets (e.g. `192.168.1.0/24,10.0.0.0/8`).
  - The backend traverses the `X-Forwarded-For` chain right-to-left, trusting only hops in the configured CIDRs and stopping at the nearest untrusted boundary. Any attacker-injected prefixes beyond that boundary are discarded.

---

## 6. Social Token Vault (AES-256-GCM)

All third-party OAuth access tokens, refresh tokens, and webhook secrets are encrypted at rest in MongoDB using authenticated AES-256-GCM (`src/utils/tokenCrypto.js`).

### 6.1. Encryption Standard
- **Algorithm:** `aes-256-gcm`
- **Key Derivation:** The 32-byte encryption key is resolved from `TOKEN_ENCRYPTION_KEY` (a 64-character hex string). In production, an insecure placeholder (such as 64 zeros) throws a fatal startup exception.
- **Initialization Vector (IV):** A unique, cryptographically random 12-byte IV (`crypto.randomBytes(12)`) is generated for every individual encryption operation.
- **Authentication Tag:** A 16-byte GCM authentication tag verifies ciphertext integrity and protects against bit-flipping attacks.
- **Storage Format:** Serialized as three base64url-encoded segments:
  ```text
  ${ivBase64Url}.${authTagBase64Url}.${ciphertextBase64Url}
  ```

### 6.2. Decryption & Tamper Resistance
If ciphertext or authentication tags are tampered with, `crypto.createDecipheriv` throws an authentication error. The utility catches this safely and returns `null` rather than exposing raw errors, preventing padding-oracle attacks.

---

## 7. CSRF & State Token Security

All social OAuth flows (Meta, Twitter, LinkedIn) utilize short-lived state tokens persisted in MongoDB (`OAuthState`):
1. **Token Generation:** 24 cryptographically random bytes (`crypto.randomBytes(24).toString('hex')`).
2. **Atomic Single-Use Consumption:** When the OAuth provider redirects back to the callback route, the backend executes `OAuthState.findOneAndDelete({ state, platform })`. If the state token does not exist or has already been used, the request is immediately rejected.
3. **Automatic Expiration (TTL):** Every state document has an `expiresAt` timestamp (+10 minutes) governed by a MongoDB TTL index (`{ expires: 0 }`), ensuring stale states are automatically purged.
