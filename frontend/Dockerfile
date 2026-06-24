# Stage 1: Build the React Router application (SSR mode)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts react-router.config.ts ./
COPY app/ ./app/

RUN npm run build

# Stage 2: Minimal Node.js runtime
FROM node:20-alpine

WORKDIR /app

# Copy the full build output (server + client bundles)
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# API_URL tells the server where the backend is (K8s internal DNS)
ENV API_URL=http://student-backend:8080

# Cognito configuration (override at deploy time)
ENV COGNITO_USER_POOL_ID=REPLACE_WITH_COGNITO_USER_POOL_ID
ENV COGNITO_CLIENT_ID=REPLACE_WITH_COGNITO_CLIENT_ID

ENV PORT=80
ENV NODE_ENV=production

EXPOSE 80

CMD ["npx", "react-router-serve", "./build/server/index.js"]
