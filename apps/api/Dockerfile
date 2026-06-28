FROM node:25-slim

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PORT=8787

WORKDIR /workspace

RUN npm install -g pnpm@11.7.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile && pnpm --filter @creator/api build

ENV NODE_ENV=production

RUN useradd --create-home --shell /usr/sbin/nologin api && chown -R api:api /workspace
USER api

EXPOSE 8787
HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=15s CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 8787}/health`).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["pnpm", "--filter", "@creator/api", "start"]
