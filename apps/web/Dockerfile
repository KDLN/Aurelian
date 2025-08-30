# Multi-stage Docker build for optimized production image
# Stage 1: Dependencies and build
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Enable corepack for proper package manager support
RUN corepack enable

# Stage 2: Install dependencies
FROM base AS deps

# Copy package files for dependency installation
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY apps/web/package.json ./apps/web/

# Install dependencies (including devDependencies for build)
RUN npm ci --frozen-lockfile

# Stage 3: Build application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code and configuration
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the database package first
WORKDIR /app/packages/database
RUN npm run build

# Build the web application
WORKDIR /app/apps/web
RUN npm run build

# Stage 4: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy built application
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

# Copy database package
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/

# Copy Prisma client and schema
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]