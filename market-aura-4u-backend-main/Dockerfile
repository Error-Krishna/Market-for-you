# ==============================================================================
# Market Aura 4U — Backend API Production Container
# Multi-stage, non-root, hardened Node.js 22 LTS container
# ==============================================================================

# --- Stage 1: Dependency Installation ---
FROM node:22-alpine AS dependencies

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# --- Stage 2: Production Runtime ---
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Install curl for container health check
RUN apk add --no-cache curl

# Copy installed production dependencies from build stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./

# Copy source code and documentation
COPY src/ ./src/

# Use unprivileged node user
USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "src/app.js"]
