FROM node:20-alpine
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Copy pre-generated Prisma client and schema
COPY node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 8787

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8787

# Start the server
CMD ["node", "dist/index.js"]