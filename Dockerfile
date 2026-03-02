# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build
RUN npx prisma generate

# Production stage
FROM node:20-bullseye-slim AS production

WORKDIR /app

# ffmpeg and Chromium are needed for yt-dlp and Playwright (Facebook scraping).
# Install OpenSSL so Prisma's native engine can load libssl.so.1.1
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    chromium \
    ca-certificates \
    fonts-freefont-ttf \
    libnss3 \
    openssl && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium

COPY package*.json ./
COPY prisma ./prisma/
COPY scripts ./scripts

# Install production deps, generate Prisma client, and download yt-dlp binary — all baked into the image.
RUN npm ci --only=production && \
    npx prisma generate && \
    node scripts/download-yt-dlp.js

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
