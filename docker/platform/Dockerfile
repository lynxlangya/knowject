FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/platform/package.json apps/platform/package.json
COPY packages/request/package.json packages/request/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile --filter platform...

COPY apps/platform apps/platform
COPY packages/request packages/request
COPY packages/ui packages/ui

RUN pnpm --filter platform build

FROM nginx:1.27-alpine AS runner

COPY docker/platform/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/platform/dist /usr/share/nginx/html

EXPOSE 80
