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
FROM node:20-alpine AS production

WORKDIR /app

# ffmpeg is needed by yt-dlp for post-processing
RUN apk add --no-cache ffmpeg

# Install Playwright dependencies (Chromium for Facebook scraping)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium-browser

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
