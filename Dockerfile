FROM oven/bun:1.3.14-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY server ./server
COPY client ./client
COPY vite.config.ts svelte.config.mjs tsconfig*.json ./
RUN bun run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "server/index.ts"]
