
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json
EXPOSE 8080
ENV PORT=8080
CMD ["node","dist/index.js"]
