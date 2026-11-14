# Market Aura — AI Content & Multi-Platform Publishing Studio

A unified digital marketing workspace combining brand-grounded AI content generation, an ML recommender service for engagement & optimal posting windows, connected social/email/blog publishing, automated post scheduling, manual broadcast uploads, and a media library.

## Architecture

- **`market-aura-4u-frontend-main/`** — React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, Vitest.
- **`market-aura-4u-backend-main/`** — Node.js / Express 5 REST API, MongoDB / Mongoose, AES-256-GCM encrypted OAuth/token vault, background scheduler worker, per-platform publishers (`twitter`, `linkedin`, `instagram`, `facebook`, `email`, `blog`), and local/URL media CRUD.
- **`CAPSTONE/`** — Python ML recommender service (`serve.py`, `pipeline.py`, trained `artifacts/v1.0/`) providing hashtag, format, engagement, and recommended posting window predictions.

## Quick Start

1. Configure environment files:
   - Copy `market-aura-4u-backend-main/.env.example` to `market-aura-4u-backend-main/.env` and populate MongoDB, JWT, Groq, `TOKEN_ENCRYPTION_KEY`, and OAuth credentials.
   - Ensure `CAPSTONE/.venv` has Python dependencies installed (`pip install -r CAPSTONE/requirements-prod.txt`).
2. Use the Node version in `.node-version` and install workspace dependencies from the repository root:
   ```bash
   npm ci --engine-strict
   ```
   CI and local workspace installs use the root `package-lock.json`. The lockfiles in the frontend and backend directories serve standalone builds, including their Dockerfiles.
3. Run all three services concurrently:
   ```bash
   npm run dev
   ```

## Quality Gates, Pre-Commit & CI/CD

- **Pre-commit (`.husky/pre-commit`)**: Runs `lint-staged` (ESLint + Prettier on staged files), frontend TypeScript typechecking (`tsc -b`), and backend ESLint checks.
- **Pre-push (`.husky/pre-push`)**: Runs frontend Vitest tests and backend CI unit/route tests.
- **GitHub Actions (`.github/workflows/ci.yml`)**: Runs typecheck, ESLint, Prettier, unit/integration tests, production Vite build, and Python recommender tests on every push and PR to `main`.

### Root Workspace Scripts

```bash
npm run lint           # Lint backend JS + frontend TypeScript, ESLint, and Prettier
npm run test           # Run backend CI suite + frontend Vitest suite
npm run test:ml        # Run CAPSTONE recommender Python tests
npm run build          # Production frontend build
```
