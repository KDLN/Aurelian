FROM node:20-alpine
WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./

# Copy prisma schema
COPY prisma ./prisma

# Copy app-specific files
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/

# Install all dependencies (including dev for building)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY apps/worker/src ./apps/worker/src

# Build the TypeScript code
WORKDIR /app/apps/worker
RUN npm run build

# Remove dev dependencies
WORKDIR /app
RUN npm prune --production

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]