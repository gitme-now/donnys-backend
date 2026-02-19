# Donny's Backend Service

## Summary
Build a TypeScript backend using NestJS that scrapes YouTube and Facebook (no API keys for MVP) once daily and on-demand via an admin API. Use yt-dlp for YouTube metadata and Playwright for Facebook scraping. Store metadata plus small thumbnails; videos remain embedded via their original URLs. Use Postgres for metadata, an S3-compatible bucket for thumbnails, and BullMQ + Redis for background jobs. Schedule daily scrapes at 09:00 America/Chicago. Deduplicate by remote ID. Admin auth deferred for MVP.

## Requirements (MVP)
1. Scraping
   - Scrape all videos and photos from provided YouTube and Facebook handles.
   - Scrape Facebook events and contact information (page-level contact details).
   - Use third-party tools (yt-dlp + Playwright). No platform auth/API keys for MVP.
   - Run automatically once per day and allow manual triggering via API.
2. Data
   - Store metadata for videos, photos, events, and contacts.
   - Persist small thumbnails to S3-compatible storage; keep original remote URLs for embeds.
   - Do not store full video blobs for MVP.
3. API
   - REST endpoints to serve `videos`, `photos`, `events`, and `contacts`.
   - Admin endpoint `POST /admin/scrape` to trigger scrapes on-demand.
   - OpenAPI/Swagger for API docs.
4. Deduplication & consistency
   - Use `remoteId` + `source` upsert semantics to avoid duplicates.
   - Maintain `ScrapeRun` logs for visibility and retry.
5. Scheduling & ops
   - Daily scheduled job at 09:00 America/Chicago.
   - Use retry/backoff, logging, and basic metrics.
6. Security & legal
   - Channels are owned by the operator; legal concerns noted but official APIs may be considered later.
   - Admin auth is deferred; secure before public deployment.

## Tech stack (decided)
- Language & framework: TypeScript + NestJS
- YouTube scraping: `yt-dlp` for metadata and thumbnails
- Facebook scraping: Playwright (headless Chromium)
- Database: Postgres (Prisma recommended)
- Object storage: S3-compatible (AWS S3 / MinIO / GCS)
- Queue & scheduler: BullMQ + Redis (workers for scraping)
- Testing: Jest for unit/integration tests
- Containerization: Docker + docker-compose for local dev

## High-level Implementation Steps
1. Scaffold repo (NestJS + TypeScript, `package.json`, `tsconfig.json`, `Dockerfile`, `.env.example`).
2. Add Prisma schema and migrations for `Video`, `Photo`, `Event`, `Contact`, and `ScrapeRun`.
3. Implement scrapers:
   - `yt-scraper` (wrap `yt-dlp`) to extract metadata and thumbnail URL.
   - `fb-scraper` (Playwright) to collect videos, photos, events, contacts.
   - Normalizers to unify DTOs.
4. Storage adapter for thumbnail uploads to S3-compatible bucket.
5. Worker and queue: BullMQ workers perform scrapes, upsert DB, upload thumbnails, write `ScrapeRun`.
6. Scheduler: enqueue daily job at 09:00 America/Chicago; admin API enqueues manual jobs.
7. REST API: endpoints for retrieval and admin controls; Swagger docs.
8. Observability: health, logs, metrics, retry/backoff, error reporting.
9. Tests & CI: unit + integration tests, CI to run tests and build image.
10. Docs: `README.md` with setup/run instructions and example API calls.

## Env vars (examples)
- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_KEY`, `S3_SECRET`
- `YT_DLP_PATH`
- `CRON_TIMEZONE=America/Chicago`
- `CRON_SCHEDULE=0 9 * * *`

## Verification
- Local dev with docker-compose (Postgres, Redis, MinIO, app)
- Manual `POST /admin/scrape` to verify DB inserts and thumbnail uploads
- `GET /videos` returns metadata with `remoteUrl` and `thumbnailUrl`
- Re-run to verify dedup/upsert by `remoteId`

## Decisions (confirmed)
- TypeScript + NestJS
- 10–100 initial channels/media expected
- REST API style
- Daily schedule at 09:00 America/Chicago
- Remote-ID dedupe
- Store metadata + thumbnails; videos remain external
- Admin auth deferred for MVP
