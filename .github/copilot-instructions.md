# Copilot Instructions — Donny's Backend

## Project Purpose
NestJS REST API that scrapes YouTube (via `yt-dlp`) and Facebook (via Playwright/Chromium) on a daily schedule and on-demand. Stores metadata + thumbnails; videos remain embedded via original URLs. Serves scraped content to a separate frontend.

## Architecture

### Module Layout
```
src/
├── app.module.ts          # Root: registers BullMQ globally, ConfigModule (global), DatabaseModule (global)
├── config/configuration.ts # Typed env vars — always use ConfigService, never process.env directly in services
├── database/              # @Global PrismaModule — PrismaService available in all modules without re-importing
├── common/                # Shared: PaginationQueryDto, PaginatedResponseDto, HttpExceptionFilter
├── videos|photos|events|contacts/  # Feature modules (read-only REST)
├── admin/                 # Scrape trigger (POST /admin/scrape) + run history; enqueues to BullMQ
└── health/                # GET /health using @nestjs/terminus + PrismaHealthIndicator
```

### Data Flow
1. `POST /admin/scrape` → `AdminService.triggerScrape` → creates `ScrapeRun` (PENDING) → enqueues job to BullMQ queue `'scrape'`
2. Worker (not yet implemented) picks up job → scrapes channel → upserts records using `@@unique([remoteId, source])` → uploads thumbnails to S3 → updates `ScrapeRun` status
3. Frontend calls `GET /videos`, `/photos`, `/events`, `/contacts` → services query Prisma with pagination/filters → return `PaginatedResponseDto`

### Key Constants
- BullMQ queue name: `SCRAPE_QUEUE = 'scrape'` (exported from `admin.service.ts`)
- Swagger UI: `http://localhost:3000/api/docs`
- Default cron: `0 9 * * *` at `America/Chicago`

## Developer Workflows

```bash
# Local dev (all infra via Docker)
docker-compose up            # starts app + postgres + redis + minio
npm run start:dev            # watch mode outside Docker

# Database
npm run db:migrate           # prisma migrate dev (creates migration + regenerates client)
npm run db:generate          # prisma generate only (after schema change without migration)
npm run db:studio            # Prisma Studio at localhost:5555

# Build / test
npm run build                # nest build → dist/
npm test                     # jest (unit, spec files in src/)
npm run test:e2e             # jest --config test/jest-e2e.json

# Lint / format
npm run lint                 # eslint --fix
npm run format               # prettier --write
```

## Coding Patterns

### Adding a new feature module
Follow the existing pattern exactly:
1. `XxxQueryDto extends PaginationQueryDto` — add `source?`, `channelHandle?`, date filters, `sortBy`/`sortOrder` with `@IsIn([...])`
2. `XxxResponseDto` — decorate every field with `@ApiProperty`/`@ApiPropertyOptional`; **omit `rawMeta`**
3. `XxxService` — inject `PrismaService` directly (no need to import DatabaseModule); build `Prisma.XxxWhereInput` with spread conditionals; use `Promise.all([findMany, count])` for pagination; throw `NotFoundException` for missing records
4. `XxxController` — `@ApiTags`, `@ApiOperation`, `@ApiResponse` on every endpoint
5. `XxxModule` — register controller + service; **do not import DatabaseModule** (it's global)
6. Import `XxxModule` in `app.module.ts`

### Pagination (universal)
```ts
const [data, total] = await Promise.all([
  this.prisma.model.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip: (page-1)*limit, take: limit, select: {...} }),
  this.prisma.model.count({ where }),
]);
return new PaginatedResponseDto(data, total, page, limit);
```

### Deduplication / upsert pattern (for scrapers)
All content models have `@@unique([remoteId, source])`. Use `prisma.model.upsert({ where: { remoteId_source: { remoteId, source } }, create: {...}, update: {...} })`.

### Error handling
`HttpExceptionFilter` (global) maps `Prisma.PrismaClientKnownRequestError` codes: `P2025` → 404, `P2002` → 409. Throw `NotFoundException` / `ConflictException` from services for standard cases.

### BullMQ job payload shape
```ts
{ scrapeRunId: string, source: Source, channelHandle: string, types?: ScrapeType[] }
```
Jobs use `attempts: 3`, exponential backoff starting at 5 s, `removeOnComplete: false`.

## Infrastructure (local)
| Service  | URL                        | Credentials           |
|----------|----------------------------|-----------------------|
| Postgres | localhost:5432/donnys      | donnys / donnys       |
| Redis    | localhost:6379             | —                     |
| MinIO    | localhost:9000 (API)       | minioadmin / minioadmin |
| MinIO UI | localhost:9001             | minioadmin / minioadmin |

S3 bucket `donnys-thumbnails` is created automatically by `minio-init` on first `docker-compose up`.

## Environment Variables
Copy `.env.example` → `.env`. Key vars: `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY`, `YT_DLP_PATH`, `CRON_TIMEZONE`, `CRON_SCHEDULE`, `SWAGGER_ENABLED`, `CORS_ENABLED`.

## Important Constraints
- **Admin auth is deferred** — `POST /admin/scrape` is unprotected in MVP; do not add auth unless explicitly asked
- **`rawMeta` must never appear in response DTOs** — it holds raw scraped payloads and is internal only
- **`strictNullChecks: false`** — tsconfig has this off; don't rely on strict null inference
- Scraper workers (`yt-dlp` + Playwright) are **not yet implemented** — the queue consumer / worker class is the next major piece to build
