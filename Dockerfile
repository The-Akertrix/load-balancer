FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --production

COPY src ./src
COPY tsconfig.json ./
COPY config.json ./

EXPOSE 7010

CMD ["bun", "run", "src/index.ts"]