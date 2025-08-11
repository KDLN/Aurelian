FROM node:20-alpine
WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git

# Copy root package files
COPY package*.json ./

# Copy prisma schema for database access
COPY prisma ./prisma

# Copy app-specific files
COPY apps/realtime/package.json ./apps/realtime/
COPY apps/realtime/tsconfig.json ./apps/realtime/

# Install all dependencies (including dev for building)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY apps/realtime/src ./apps/realtime/src

# Build the TypeScript code
WORKDIR /app/apps/realtime
RUN npm run build

# Remove dev dependencies
WORKDIR /app
RUN npm prune --production

# Expose port
EXPOSE 8787

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8787

# Start the server
WORKDIR /app/apps/realtime
CMD ["node", "dist/index.js"]