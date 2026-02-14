# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/server/package.json packages/server/
COPY packages/sdk/package.json packages/sdk/
COPY packages/dashboard/package.json packages/dashboard/

RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/server packages/server
COPY packages/sdk packages/sdk
COPY packages/dashboard packages/dashboard

RUN pnpm build

# Production stage
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/dashboard/dist ./dashboard
COPY --from=builder /app/packages/server/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

VOLUME ["/data"]
ENV AGENTKEYS_DATA_DIR=/data
ENV AGENTKEYS_PORT=8888
ENV AGENTKEYS_HOST=0.0.0.0

EXPOSE 8888

CMD ["node", "dist/index.js", "serve", "--data", "/data", "--host", "0.0.0.0"]
