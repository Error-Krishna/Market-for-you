# Market Aura 4U — Documentation Index

Welcome to the comprehensive technical documentation for **Market Aura 4U** (Market-for-you). This documentation suite provides software architects, full-stack engineers, DevOps specialists, contributors, and security auditors with verified, in-depth architectural and operational guides derived directly from the application codebase.

---

## Documentation Navigation

```
docs/
├── README.md                   # Documentation index and reading paths (this file)
├── ARCHITECTURE.md             # Complete system architecture, data flows, and subsystem specifications
├── API_REFERENCE.md            # Exhaustive REST API endpoint catalog, contracts, and error responses
├── DATABASE.md                 # MongoDB data models, schemas, compound indexes, TTL, and locking
├── ENVIRONMENT_VARIABLES.md    # Master environment variable reference and configuration matrices
├── AUTHENTICATION.md           # Authentication, session handling, rate limiting, and proxy security
├── INTEGRATIONS.md             # Third-party integrations: Meta, Twitter, LinkedIn, Groq, R2, Razorpay
├── DEPLOYMENT.md               # Production deployment guide: Vercel, Render, MongoDB Atlas, and Docker
├── TESTING.md                  # Comprehensive testing guide: Vitest, Node.js test runner, and Pytest
├── TROUBLESHOOTING.md          # Diagnostic runbooks and verified solutions for common operational issues
├── SECURITY.md                 # Cryptographic controls, SSRF defenses, CORS enforcement, and threat model
└── CONTRIBUTING.md             # Development workflows, git conventions, and quality gates
```

### Specialized Configuration Guides

In addition to the core documentation modules above, specialized operational runbooks are available:

- [Cloudflare R2 Media Storage Setup](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/CLOUDFLARE_R2_SETUP.md) — Detailed S3-compatible bucket setup, CORS, and public delivery.
- [Meta (Instagram & Facebook) Setup](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/META_SETUP.md) — Developer portal setup, Unified Login configuration, and OAuth callbacks.
- [Render Deployment Guide](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/RENDER_DEPLOYMENT.md) — Web service configuration, environment synchronization, and scaling.
- [Vercel Deployment Guide](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/VERCEL_DEPLOYMENT.md) — Frontend SPA build configuration and Edge CDN routing.
- [Post-Deployment Verification Checklist](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/POST_DEPLOYMENT_CHECKLIST.md) — Step-by-step smoke tests and post-launch verification.
- [Complete Technical Project Report](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/Market_Aura_4U_Complete_Project_Report.md) — Historical engineering audit, remediation, and architectural lifecycle report.

---

## Suggested Reading Paths

### For New Developers & Contributors
1. Start with the root [README.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/README.md) for a high-level overview.
2. Read [docs/ARCHITECTURE.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/ARCHITECTURE.md) to understand service boundaries and data flows.
3. Review [docs/ENVIRONMENT_VARIABLES.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/ENVIRONMENT_VARIABLES.md) to prepare local `.env` files.
4. Follow [docs/CONTRIBUTING.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/CONTRIBUTING.md) and [docs/TESTING.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/TESTING.md) to run the test suite and submit pull requests.

### For DevOps & Cloud Engineers
1. Read [docs/DEPLOYMENT.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/DEPLOYMENT.md) for the decoupled Vercel + Render production topology.
2. Review [docs/ENVIRONMENT_VARIABLES.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/ENVIRONMENT_VARIABLES.md) for required production secrets.
3. Read [docs/SECURITY.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/SECURITY.md) to inspect network security, CORS restrictions, and rate limiters.
4. Follow [docs/TROUBLESHOOTING.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/TROUBLESHOOTING.md) when diagnosing infrastructure issues.

### For API Consumers & Frontend Engineers
1. Explore [docs/API_REFERENCE.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/API_REFERENCE.md) for endpoint paths, payload schemas, and response formats.
2. Read [docs/AUTHENTICATION.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/AUTHENTICATION.md) for JWT token handling, cookies, and protected route policies.
3. Check [docs/DATABASE.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/DATABASE.md) to understand persisted entities and relationships.

---

## Source of Truth & Accuracy Standard

All documentation in this repository is maintained against the **actual implementation** in the source tree:
- Frontend: `market-aura-4u-frontend-main/`
- Backend API: `market-aura-4u-backend-main/`
- ML Recommender Service: `CAPSTONE/`
- Monorepo Orchestration: Root `package.json`, `render.yaml`, `vercel.json`, and `docker-compose.yml`

Documentation is verified against automated quality gates and package scripts. No theoretical or unreleased features are presented as implemented.
