# Multi-stage Docker build for optimized worker service
# Stage 1: Base image with system dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++ curl
WORKDIR /app
RUN corepack enable

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY apps/worker/package.json ./apps/worker/
RUN npm ci --frozen-lockfile

# Stage 3: Build application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules

# Copy source and build
COPY . .
RUN npx prisma generate

# Build database package
WORKDIR /app/packages/database
RUN npm run build

# Build worker service
WORKDIR /app/apps/worker
RUN npm run build

# Stage 4: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 worker
RUN adduser --system --uid 1001 worker

# Install runtime dependencies only
RUN apk add --no-cache curl

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy built application with minimal footprint
COPY --from=builder --chown=worker:worker /app/apps/worker/dist ./dist
COPY --from=builder --chown=worker:worker /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=worker:worker /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=worker:worker /app/packages/database/prisma ./packages/database/prisma

# Copy only production node_modules
COPY --from=deps --chown=worker:worker /app/node_modules ./node_modules

# Switch to non-root user
USER worker

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]