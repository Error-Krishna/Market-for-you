# ==============================================================================
# Market Aura 4U — Frontend Web SPA Production Container
# Multi-stage, high-performance static asset hosting via Nginx Alpine
# ==============================================================================

# --- Stage 1: Build the Vite + React Application ---
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for compile-time environment variables
ARG VITE_API_URL=""

ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Run strict TypeScript typecheck and Vite production build
RUN npm run build

# --- Stage 2: Serve with Nginx Alpine ---
FROM nginx:alpine AS runtime

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
