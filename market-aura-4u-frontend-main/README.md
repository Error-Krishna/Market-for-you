# Market Aura 4U — Frontend Web Application

The frontend single-page application (SPA) for **Market Aura 4U**, built with React 19, TypeScript, Vite, Tailwind CSS v4, and TanStack Query.

---

## Architecture & Technology Stack

- **Framework:** React 19 (`^19.2.8`) + React DOM (`^19.2.8`)
- **Build Tool:** Vite (`^8.2.2`) with `@vitejs/plugin-react` (`^6.1.0`)
- **Language:** TypeScript (`~6.0.2` / 5.x)
- **Styling:** Tailwind CSS v4 (`^4.3.3`) via `@tailwindcss/vite`
- **Routing:** React Router DOM v7 (`^7.18.3`)
- **Server State & Caching:** TanStack React Query v5 (`^5.102.8`)
- **Form Handling:** React Hook Form (`^7.87.0`) + Zod (`^4.5.4`) with `@hookform/resolvers`
- **Icons:** Lucide React (`^1.37.0`)
- **HTTP Client:** Axios (`^1.20.0`)
- **Testing:** Vitest (`^4.1.11`) + Testing Library (`@testing-library/react` `^16.3.3`, `@testing-library/jest-dom` `^7.0.1`)

---

## Directory Structure

```
market-aura-4u-frontend-main/src/
├── app/
│   ├── config/env.ts              # API URL normalization & environment validation
│   ├── providers/QueryProvider.tsx# TanStack Query client provider
│   └── router/                    # Route definitions, guards (ProtectedRoute, OnboardingRoute)
├── assets/                        # Static assets (hero.png, icons)
├── components/
│   ├── layout/                    # Sidebar, Topbar, OnboardingBanner, navigation items
│   └── ui/                        # Reusable design system components (Button, Card, Input, Label)
├── features/
│   ├── auth/                      # Login, Signup, AuthProvider, schemas, types
│   ├── billing/                   # Razorpay plan display, subscription status hooks
│   ├── content/                   # Content generation hooks, preview views, error mapping
│   ├── media/                     # MediaPickerModal, base64 reader, media API client
│   ├── onboarding/                # Multi-step brand onboarding wizard & schemas
│   ├── posts/                     # Scheduled posts list, DeliveryReview panel, ManualBroadcastComposer
│   ├── settings/                  # Profile, Brand Voice, Password update forms
│   ├── social-accounts/           # Social connection cards, OAuth status handler
│   └── theme/                     # Dark/Light/System theme provider & context
├── layouts/                       # AppLayout, AuthLayout, OnboardingLayout, PublicLayout
├── lib/
│   ├── api/                       # Centralized Axios client & error normalizers
│   └── query/                     # QueryClient instance
├── pages/
│   ├── app/                       # Dashboard, Content, Media, Posts, Billing, Settings, Social
│   ├── auth/                      # Login, Signup
│   ├── onboarding/                # OnboardingPage
│   └── public/                    # HomePage, NotFoundPage
└── styles/                        # CSS design tokens & global Tailwind utilities
```

---

## Available Scripts

Run from `market-aura-4u-frontend-main/` or via root `npm --prefix market-aura-4u-frontend-main <script>`:

```bash
# Start Vite development server on http://localhost:5173
npm run dev

# Run Vitest test suite
npm test

# Run TypeScript typechecker
npm run typecheck

# Run ESLint check
npm run lint

# Automatically fix ESLint issues
npm run lint:fix

# Check formatting with Prettier
npm run format:check

# Format code with Prettier
npm run format

# Run all quality checks (typecheck + lint + format:check)
npm run check

# Build production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Environment Configuration

Configure `market-aura-4u-frontend-main/.env`:

```dotenv
# Centralized Backend API Base URL
# Accepts: https://<api>.onrender.com or with /api or with /api/v1 (normalized automatically)
VITE_API_BASE_URL=http://localhost:8000/api
```

See the root [docs/ENVIRONMENT_VARIABLES.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/ENVIRONMENT_VARIABLES.md) and [docs/DEPLOYMENT.md](file:///Users/krishnagoyal/Development/Market%20Aura%20For%20you/docs/DEPLOYMENT.md) for production Vercel setup.
