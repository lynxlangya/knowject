FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api

RUN pnpm --filter api build

FROM node:22-bookworm-slim AS runner

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --prod --frozen-lockfile --filter api...

COPY --from=builder /workspace/apps/api/dist /workspace/apps/api/dist
COPY docker/api/start-api.sh /usr/local/bin/start-api

RUN chmod +x /usr/local/bin/start-api && chown -R node:node /workspace

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then(async (response) => { if (!response.ok) { process.exit(1); } const payload = await response.json().catch(() => null); process.exit(payload?.status === 'ok' ? 0 : 1); }).catch(() => process.exit(1));"]

CMD ["start-api"]
