
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json
EXPOSE 8787
ENV PORT=8787
CMD ["node","dist/index.js"]
