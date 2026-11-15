# Market Aura 4U — Database Architecture & Schema Specification

This document provides a complete technical reference for the data persistence layer of **Market Aura 4U**. It documents the database technology, connection lifecycle, Mongoose schemas, compound indexes, TTL mechanisms, and concurrency controls.

---

## 1. Database Architecture & Connection Lifecycle

- **Database Engine:** MongoDB 7 / MongoDB Atlas (Replica Set).
- **Object Data Modeling (ODM):** Mongoose 8 (`8.19.2`).
- **Connection Module:** `market-aura-4u-backend-main/src/config/db.js`.
- **Pool Tuning:**
  ```javascript
  function getDbConnectionOptions(env = process.env) {
    const maxPoolSize = Number(env.MONGO_MAX_POOL_SIZE) || (env.VERCEL ? 10 : 20);
    return {
      maxPoolSize,
      serverSelectionTimeoutMS: 5000,
    };
  }
  ```
- **Connection Resilience:**
  - `serverSelectionTimeoutMS: 5000`: Fast failover if the primary node is unreachable, avoiding hanging HTTP sockets.
  - `maxPoolSize`: 20 connections on persistent Web Services (Render), 10 in serverless environments, protecting against connection exhaustion on MongoDB Atlas M0 free clusters.

---

## 2. Collection & Model Directory

```
market-aura-4u-backend-main/src/models/
├── User.js             # User accounts, brand profiles, credits, subscriptions, legacy social accounts
├── SocialAccount.js    # Multi-tenant, multi-account encrypted social credentials
├── ScheduledPost.js    # Post queue, platform deliveries, distributed locks, outcome tracking
├── MediaAsset.js       # Media asset metadata, Cloudflare R2 / filesystem references
├── Job.js              # Asynchronous AI generation job results and prompts
└── OAuthState.js       # Ephemeral OAuth 2.0 PKCE state tokens with automatic TTL expiration
```

---

## 3. Detailed Schema Specifications

### 3.1. User Model (`User.js`)
Persists user authentication credentials, brand identity, usage credits, subscription tier, and legacy social tokens.

#### Fields:
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `email` | `String` | Required, Unique, Trimmed | Account email identifier |
| `password` | `String` | Required | Bcrypt password hash |
| `name` | `String` | Optional | User display name |
| `onboardingCompleted` | `Boolean` | Default: `false` | Workspace gatekeeper flag |
| `isPremium` | `Boolean` | Default: `false` | Premium entitlement flag |
| `timezone` | `String` | Default: `'UTC'` | Preferred local timezone for scheduling |
| `settings.theme` | `String` | Enum: `['light', 'dark', 'system']`, Default: `'system'` | UI theme preference |
| `settings.notifications.emailAlerts` | `Boolean` | Default: `true` | Email notifications toggle |
| `settings.notifications.weeklyDigest` | `Boolean` | Default: `false` | Digest notifications toggle |
| `credits.monthly` | `Number` | Default: `100` | Monthly allocated generation credits |
| `credits.used` | `Number` | Default: `0` | Debited credits in current billing cycle |
| `brandProfile.companyName` | `String` | Default: `''` | Brand / Company name |
| `brandProfile.industry` | `String` | Default: `''` | Business vertical / industry |
| `brandProfile.description` | `String` | Default: `''` | Long-form brand background |
| `brandProfile.uvp` | `String` | Default: `''` | Unique Value Proposition |
| `brandProfile.targetAudience` | `Mixed` | String or Object | Target customer demographic |
| `brandProfile.marketingGoal` | `String` | Default: `''` | Core marketing objective |
| `brandProfile.brandVoice.tone` | `String` | Default: `'Professional'` | Brand voice tone descriptor |
| `brandProfile.brandVoice.description` | `String` | Default: `''` | Brand personality rules |
| `brandProfile.platforms` | `[String]` | Enum: `twitter`, `linkedin`, `instagram`, `facebook`, `email`, `blog` | Enabled channels |
| `subscription.status` | `String` | Default: `'free'` | Subscription status (`free`, `active`) |
| `subscription.plan` | `String` | Default: `'starter'` | Plan ID (`starter`, `pro`, `enterprise`) |
| `subscription.startDate` | `Date` | Optional | Subscription activation date |
| `subscription.paymentId` | `String` | Optional | Razorpay payment transaction reference |
| `socialAccounts` | `Object` | Embedded platform sub-objects | Legacy social connection object (see SocialAccount for canonical multi-tenant store) |

#### Indexes:
- Unique Index: `{ email: 1 }`

---

### 3.2. SocialAccount Model (`SocialAccount.js`)
Canonical multi-tenant, multi-account store for social media connections. Supports connecting multiple accounts per provider (e.g. 2 Twitter accounts or 3 Facebook Pages) per user.

#### Fields:
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `userId` | `ObjectId` | Ref: `User`, Required, Indexed | Account owner ID |
| `provider` | `String` | Enum: `twitter`, `linkedin`, `instagram`, `facebook`, `email`, `blog` | Provider identifier |
| `providerAccountId` | `String` | Required, Trimmed | Platform-specific ID (e.g. Instagram ID, Twitter User ID) |
| `username` | `String` | Default: `null` | Platform username/handle |
| `displayName` | `String` | Default: `null` | Platform display name |
| `profileImage` | `String` | Default: `null` | Remote profile picture URL |
| `email` | `String` | Default: `null` | Associated account email |
| `encryptedAccessToken` | `String` | Default: `null`, `select: false` | AES-256-GCM encrypted access token |
| `encryptedRefreshToken` | `String` | Default: `null`, `select: false` | AES-256-GCM encrypted refresh token |
| `tokenExpiry` | `Date` | Default: `null` | Token expiration timestamp |
| `grantedScopes` | `[String]` | Array of strings | Scopes authorized during OAuth |
| `connectionStatus` | `String` | Enum: `connected`, `expired`, `disconnected`, `error` | Connection health state |
| `lastConnectedAt` | `Date` | Default: `Date.now` | Initial connection timestamp |
| `lastRefreshedAt` | `Date` | Default: `null` | Last token refresh timestamp |
| `lastError` | `String` | Default: `null` | Last error diagnostic message |
| `metadata` | `Mixed` | Default: `{}` | Provider-specific metadata (page tokens, webhook URLs) |

#### Security Transformations & Redactions:
```javascript
toJSON: {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.encryptedAccessToken;
    delete ret.encryptedRefreshToken;
    return ret;
  },
}
```
Tokens are excluded by default in schema queries (`select: false`) and automatically purged during JSON serialization to prevent token leakage in API responses.

#### Indexes:
- Compound Unique Index: `{ userId: 1, provider: 1, providerAccountId: 1 }`
- Compound Index: `{ userId: 1, connectionStatus: 1 }`
- Compound Index: `{ provider: 1, providerAccountId: 1 }`

---

### 3.3. ScheduledPost Model (`ScheduledPost.js`)
Tracks posts in the scheduling queue, platform delivery outcomes, distributed worker leases, and retry backoffs.

#### Subdocument: `platformDeliverySchema`
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `platform` | `String` | Enum: `twitter`, `linkedin`, `instagram`, `facebook`, `email`, `blog` | Delivery channel |
| `content` | `Mixed` | Required | Platform-specific copy / slides / caption |
| `mediaAssetIds` | `[ObjectId]` | Ref: `MediaAsset` | Associated internal media assets |
| `mediaUrls` | `[String]` | Array of URLs | External or resolved media URLs |
| `status` | `String` | Enum: `pending`, `processing`, `published`, `failed`, `cancelled` | Per-platform delivery state |
| `attempts` | `Number` | Default: `0` | Number of execution attempts |
| `lastError` | `String` | Default: `null` | Error message on failure |
| `retryable` | `Boolean` | Default: `false` | Whether failure allows automatic retry |
| `outcomeUnknown` | `Boolean` | Default: `false` | True if network interrupted during delivery |
| `outcomeReviewedAt` | `Date` | Default: `null` | Timestamp when user reviewed unknown state |
| `externalPostId` | `String` | Default: `null` | ID returned by platform API on success |
| `externalPostUrl` | `String` | Default: `null` | Web URL to view the live published post |
| `publishedAt` | `Date` | Default: `null` | Successful publication timestamp |

#### Root Document: `scheduledPostSchema`
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `userId` | `ObjectId` | Ref: `User`, Required, Indexed | Post owner ID |
| `jobId` | `ObjectId` | Ref: `Job`, Default: `null` | Originating AI generation Job ID |
| `sourceType` | `String` | Enum: `ai_generated`, `manual_broadcast` | How the post was created |
| `title` | `String` | Required, Max 300 chars | Human-readable post identifier |
| `scheduledAt` | `Date` | Required, Indexed | Intended delivery timestamp (UTC) |
| `timezone` | `String` | Default: `'UTC'` | User timezone at time of scheduling |
| `recommendedTimeUsed` | `Boolean` | Default: `false` | Whether ML recommended time was accepted |
| `status` | `String` | Enum: `scheduled`, `processing`, `published`, `partial`, `failed`, `cancelled` | Overall post lifecycle state |
| `platforms` | `[platformDeliverySchema]`| Minimum 1 element required | Platform delivery targets |
| `lockUntil` | `Date` | Default: `null` | Distributed worker lock expiration |
| `lockedBy` | `String` | Default: `null` | Worker node identifier holding active lease |
| `retryCount` | `Number` | Default: `0` | Global retry iteration count |
| `maxRetries` | `Number` | Default: `3` | Maximum automatic retries permitted |
| `nextRetryAt` | `Date` | Default: `null`, Indexed | Timestamp for next scheduled retry |
| `deliveryOutcomeUnknown` | `Boolean`| Default: `false` | High-level flag requiring user review |
| `lastRunAt` | `Date` | Default: `null` | Timestamp of last scheduler execution attempt |

#### Optimistic Concurrency:
- Configured with `optimisticConcurrency: true`. Mongoose automatically increments and checks `__v` on every `save()` operation to prevent dirty writes when multiple scheduler workers or manual overrides coincide.

#### Indexes:
- Compound Index: `{ status: 1, scheduledAt: 1 }` (Used by scheduler polling loop)
- Compound Index: `{ status: 1, nextRetryAt: 1 }` (Used by retry executor)
- Compound Index: `{ userId: 1, scheduledAt: -1 }` (Used by user dashboard post list)

---

### 3.4. MediaAsset Model (`MediaAsset.js`)
Maintains metadata and storage locations for user-uploaded images/videos and registered external media links.

#### Fields:
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `userId` | `ObjectId` | Ref: `User`, Required, Indexed | Asset owner ID |
| `title` | `String` | Required, Max 160 chars | Asset name / title |
| `altText` | `String` | Default: `''`, Max 500 chars | Accessibility alt text |
| `tags` | `[String]` | Array of strings, Max 50 chars each | Search and categorization tags |
| `mediaType` | `String` | Enum: `image`, `video`, Default: `'image'` | High-level media category |
| `sourceType` | `String` | Enum: `upload`, `url` | Origin of the asset |
| `storageProvider`| `String` | Enum: `r2`, `local`, `url`, Default: `'local'` | Active storage engine |
| `url` | `String` | Required, Max 2048 chars | Public HTTPS URL for rendering |
| `storageKey` | `String` | Default: `null` | S3 object key or relative filesystem path |
| `mimeType` | `String` | Default: `'image/jpeg'` | MIME content type |
| `sizeBytes` | `Number` | Default: `0`, Min: `0` | File size in bytes (for quota tracking) |

#### Indexes:
- Compound Index: `{ userId: 1, createdAt: -1 }`

---

### 3.5. Job Model (`Job.js`)
Records asynchronous LLM generation requests and responses.

#### Fields:
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `userId` | `ObjectId` | Ref: `User`, Required, Indexed | Requester user ID |
| `status` | `String` | Enum: `processing`, `completed`, `failed` | Generation execution status |
| `platforms` | `[String]` | Array of strings | Requested target platforms |
| `originalContent` | `String` | String | User's initial prompt |
| `generatedContent`| `Map` | Key-value mapping of platform copy | Structured output from LLM |
| `error` | `String` | Optional string | Failure diagnostic message |

---

### 3.6. OAuthState Model (`OAuthState.js`)
Maintains short-lived cryptographic tokens for OAuth 2.0 PKCE and CSRF state validation.

#### Fields:
| Field Path | Type | Constraints & Defaults | Purpose |
|---|---|---|---|
| `state` | `String` | Required, Unique, Indexed | Cryptographic random hex state token |
| `userId` | `ObjectId` | Ref: `User`, Required | Originating user ID |
| `platform` | `String` | Enum: `twitter`, `linkedin`, `instagram`, `facebook` | OAuth target platform |
| `codeVerifier` | `String` | Optional | PKCE code verifier (Twitter OAuth 2.0) |
| `returnTo` | `String` | Default: `'/social-accounts'` | Frontend redirect destination |
| `expiresAt` | `Date` | Default: `now() + 10m`, TTL Index | State expiration timestamp |

#### TTL Index:
- TTL Expiration Index: `{ expiresAt: 1 }` with `{ expires: 0 }`.
- MongoDB automatically purges expired state documents in the background, eliminating stale security state without cron jobs.
