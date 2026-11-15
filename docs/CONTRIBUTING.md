# Market Aura 4U — Contributing & Development Guide

Thank you for your interest in contributing to **Market Aura 4U**! This document provides standards, git workflows, commit conventions, and quality gates required when contributing code, bug fixes, or documentation.

---

## 1. Development Principles

1. **Implementation is Truth:** Never guess behavior or write speculative code. Always align with the established patterns in `market-aura-4u-backend-main/`, `market-aura-4u-frontend-main/`, and `CAPSTONE/`.
2. **Zero Live Secrets:** Never commit real API keys, tokens, passwords, private URLs, or production credentials. Use `.env.example` templates with safe placeholders.
3. **Quality Gates Must Pass:** All pre-commit hooks, pre-push hooks, and GitHub Actions CI checks must pass before opening or merging a Pull Request.

---

## 2. Setting Up Your Development Environment

### Prerequisites
- **Node.js:** `v22.23.5` (LTS) — specified in `.node-version`.
- **npm:** `v10.x` or higher.
- **Python:** `v3.11` (for ML Recommender in `CAPSTONE/`).
- **MongoDB:** Local instance on `mongodb://localhost:27017` or a MongoDB Atlas free sandbox cluster.

### Initial Setup Steps
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Error-Krishna/Market-for-you.git
   cd Market-for-you
   ```
2. **Install Root & Workspace Dependencies:**
   Install workspace dependencies using the locked versions:
   ```bash
   npm ci --engine-strict
   ```
3. **Configure Environment Files:**
   - Backend:
     ```bash
     cp market-aura-4u-backend-main/.env.example market-aura-4u-backend-main/.env
     ```
     Populate `MONGO_URI`, `JWT_SECREAT_KEY` (`openssl rand -hex 32`), `TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32`), and your development `GROQ_API_KEY`.
   - Frontend:
     ```bash
     cp market-aura-4u-frontend-main/.env.example market-aura-4u-frontend-main/.env
     ```
     Verify `VITE_API_BASE_URL=http://localhost:8000/api`.
   - ML Recommender (Optional for local development):
     ```bash
     cd CAPSTONE
     python3.11 -m venv .venv
     source .venv/bin/activate
     pip install -r requirements-prod.txt pytest
     cd ..
     ```
4. **Start Development Services:**
   Run all services concurrently using the root dev script:
   ```bash
   npm run dev
   ```
   Or run frontend and backend independently:
   - Backend: `npm --prefix market-aura-4u-backend-main run dev` (Port 8000)
   - Frontend: `npm --prefix market-aura-4u-frontend-main run dev` (Port 5173)

---

## 3. Git Workflow & Branching Conventions

- **Default Branch:** `main` — Always kept in a deployable, production-ready state.
- **Branch Naming Conventions:**
  - Features: `feature/<short-description>` (e.g. `feature/media-video-tags`)
  - Bug Fixes: `fix/<issue-description>` (e.g. `fix/cors-preflight-header`)
  - Documentation: `docs/<update-description>` (e.g. `docs/api-reference-update`)
  - Refactoring: `refactor/<module-name>` (e.g. `refactor/social-account-crypto`)
  - Chore / Tooling: `chore/<description>` (e.g. `chore/upgrade-deps`)

### Development Cycle
1. Update your local `main` branch:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create your feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Write clean, modular code with accompanying unit or integration tests.
4. Verify all tests pass locally before committing.

---

## 4. Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Allowed Types:
- `feat`: A new user-facing feature or capability.
- `fix`: A bug fix or defect correction.
- `docs`: Documentation changes only.
- `style`: Changes that do not affect the meaning of the code (formatting, missing semicolons, etc.).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to build processes, auxiliary tools, or libraries.

### Examples:
```text
feat(media): add tag filtering to listMedia endpoint
fix(cors): enforce exact HTTPS origin matching in production
docs(architecture): add sequence diagram for Instagram publishing
test(auth): add unit test for 72-byte password boundary
```

---

## 5. Quality Gates & Automated Validation

Before committing or pushing, verify that all quality gates pass:

```bash
# 1. Check linting and formatting across both workspaces
npm run lint

# 2. Run backend CI tests (492 tests) and frontend Vitest suite (44 tests)
npm run test

# 3. Run ML recommender test suite
npm run test:ml

# 4. Verify production bundle build
npm run build

# 5. Run pre-flight deployment verifier
npm run verify:deployment
```

### Automated Git Hooks:
- **`pre-commit`:** Automatically runs `lint-staged` (ESLint `--fix` + Prettier), frontend `tsc -b` typechecking, and backend ESLint.
- **`pre-push`:** Automatically runs frontend Vitest and backend `test:ci`.

---

## 6. Pull Request (PR) Guidelines

1. **Title:** Use Conventional Commits format matching your primary change.
2. **Description:**
   - Clearly describe the problem and the proposed solution.
   - Reference any relevant GitHub issues.
   - List the tests executed and their verification results.
3. **PR Checklist:**
   - [ ] Verified on Node.js 22 LTS.
   - [ ] Added or updated automated tests for new functionality.
   - [ ] All root test suites pass cleanly (`npm run test`).
   - [ ] No live API keys, secrets, or passwords committed.
   - [ ] Documentation updated to reflect changes.
4. **Review Process:** Once submitted, GitHub Actions CI executes all quality gates. At least one approving code review is required before merging into `main`.
