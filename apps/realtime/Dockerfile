FROM node:20-alpine
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files and Prisma
COPY package*.json ./
COPY node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Copy realtime app files
COPY apps/realtime/package*.json ./apps/realtime/
COPY apps/realtime/tsconfig.json ./apps/realtime/
COPY apps/realtime/src ./apps/realtime/src

# Install dependencies
RUN npm install

# Build the realtime app
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