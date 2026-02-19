# YouTube Scraping Implementation

This document describes the YouTube scraping functionality that has been implemented in the Donny's Backend project.

## Overview

The scraping system uses BullMQ to queue and process scraping jobs asynchronously. When a scrape is triggered via the admin API, a job is enqueued and processed by a dedicated worker that:

1. Fetches video metadata from YouTube using `yt-dlp`
2. Downloads and uploads video thumbnails to S3 (MinIO)
3. Upserts video records to the PostgreSQL database
4. Tracks scrape progress and completion status

## Components Added

### 1. S3Service (`src/common/services/s3.service.ts`)

Handles thumbnail uploads to S3/MinIO:
- `uploadThumbnail()` - Uploads a buffer to S3 with content-based naming (SHA256 hash)
- `downloadAndUploadThumbnail()` - Downloads a thumbnail from URL and uploads to S3
- Comprehensive error handling and logging

### 2. ScrapeProcessor (`src/admin/scrape.processor.ts`)

BullMQ worker that processes scrape jobs:
- Consumes jobs from the `scrape` queue
- Updates `ScrapeRun` status (PENDING → RUNNING → SUCCESS/FAILED)
- Executes `yt-dlp` to fetch video metadata from YouTube channels
- Processes videos in batches with error tolerance
- Handles retries via BullMQ (3 attempts with exponential backoff)
- Extensive logging at every step for troubleshooting

### 3. Logging Added Throughout

Console logging has been added to all controllers and services for easy troubleshooting:
- Request entry/exit logs in all controllers
- Service method entry logs with parameters
- Database operation results (counts, IDs)
- Error paths with context
- BullMQ job lifecycle events (active, completed, failed)

## How It Works

### Triggering a Scrape

```bash
POST /admin/scrape
{
  "source": "YOUTUBE",
  "channelHandle": "@donnys",
  "types": ["videos"]
}
```

**Response:**
```json
{
  "scrapeRunId": "clxxx...",
  "status": "PENDING",
  "message": "Scrape job enqueued"
}
```

### Job Processing Flow

1. **Job Enqueued**: Admin service creates a `ScrapeRun` record (status: PENDING) and adds job to BullMQ
2. **Worker Picks Up**: `ScrapeProcessor` picks up the job and updates status to RUNNING
3. **Execute yt-dlp**: Command executed to fetch up to 50 most recent videos from channel
4. **Parse Results**: JSON output parsed into video metadata objects
5. **Process Each Video**:
   - Download thumbnail from YouTube
   - Upload thumbnail to S3/MinIO
   - Upsert video record to database (deduplication via `remoteId_source` unique constraint)
6. **Complete**: Update `ScrapeRun` with itemsProcessed and status SUCCESS/FAILED

### Database Updates

Videos are upserted using the unique constraint on `(remoteId, source)`:
- **Create**: If video doesn't exist, insert new record
- **Update**: If video exists, update metadata (title, description, thumbnail, etc.)
- **rawMeta**: Full JSON payload from yt-dlp stored for debugging

### Error Handling

- yt-dlp execution errors are caught and logged with stderr output
- Individual video processing errors don't stop the batch
- Failed jobs are retried up to 3 times with exponential backoff
- ScrapeRun records track error messages for failed jobs

## Logging Output Examples

### Successful Scrape

```
[AdminController] POST /admin/scrape { dto: { source: 'YOUTUBE', channelHandle: '@donnys' } }
[AdminService] triggerScrape called { dto: { source: 'YOUTUBE', channelHandle: '@donnys' } }
[AdminService] created ScrapeRun { id: 'clxxx...', source: 'YOUTUBE', channelHandle: '@donnys' }
[AdminService] enqueue succeeded { scrapeRunId: 'clxxx...' }
[ScrapeProcessor] worker picked up job { jobId: '1', scrapeRunId: 'clxxx...' }
[ScrapeProcessor] job started { jobId: '1', scrapeRunId: 'clxxx...', source: 'YOUTUBE', channelHandle: '@donnys' }
[ScrapeProcessor] updated ScrapeRun to RUNNING { scrapeRunId: 'clxxx...' }
[ScrapeProcessor] scraping YouTube channel { channelHandle: '@donnys' }
[ScrapeProcessor] executing yt-dlp { command: 'yt-dlp --dump-json...' }
[ScrapeProcessor] yt-dlp execution succeeded { outputLength: 45230 }
[ScrapeProcessor] parsed yt-dlp output { lineCount: 50 }
[ScrapeProcessor] fetched videos from yt-dlp { count: 50 }
[ScrapeProcessor] processing video { videoId: 'abc123', title: 'Example Video' }
[S3Service] downloading thumbnail { thumbnailUrl: 'https://...' }
[S3Service] uploading thumbnail { key: 'thumbnails/youtube/@donnys/abc123.jpg', size: 34567 }
[S3Service] upload succeeded { url: 'http://localhost:9000/donnys-thumbnails/...' }
[ScrapeProcessor] thumbnail uploaded { videoId: 'abc123', thumbnailUrl: 'http://...' }
[ScrapeProcessor] video upserted { id: 'clyyy...', remoteId: 'abc123', title: 'Example Video' }
[ScrapeProcessor] YouTube scrape completed { totalVideos: 50, processedCount: 50 }
[ScrapeProcessor] job completed successfully { jobId: '1', scrapeRunId: 'clxxx...', itemsProcessed: 50 }
[ScrapeProcessor] worker completed job { jobId: '1', scrapeRunId: 'clxxx...', finishedOn: 1234567890 }
```

### Failed Job

```
[ScrapeProcessor] job started { jobId: '2', scrapeRunId: 'clzzz...', source: 'YOUTUBE', channelHandle: '@invalid' }
[ScrapeProcessor] yt-dlp execution failed { error: 'Command failed', stderr: 'ERROR: Unable to find channel...' }
[ScrapeProcessor] job failed { jobId: '2', scrapeRunId: 'clzzz...', error: 'yt-dlp failed: Command failed', stack: '...' }
[ScrapeProcessor] worker failed job { jobId: '2', scrapeRunId: 'clzzz...', error: 'yt-dlp failed...', attemptsMade: 1, attemptsLimit: 3 }
```

## Configuration

Required environment variables in `.env`:

```bash
# yt-dlp binary path (defaults to 'yt-dlp' if in PATH)
YT_DLP_PATH=yt-dlp

# S3/MinIO configuration
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=donnys-thumbnails
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# Redis for BullMQ
REDIS_URL=redis://localhost:6379
```

## Testing the Implementation

### 1. Ensure Services are Running

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (database)
- Redis (job queue)
- MinIO (S3-compatible storage)

### 2. Start the Application

```bash
npm run start:dev
```

### 3. Trigger a Test Scrape

```bash
curl -X POST http://localhost:3000/admin/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "source": "YOUTUBE",
    "channelHandle": "@donnys",
    "types": ["videos"]
  }'
```

### 4. Monitor Logs

Watch the console output for detailed logging of the scraping process.

### 5. Check Results

```bash
# List all scrape runs
curl http://localhost:3000/admin/scrape-runs

# Get specific scrape run details
curl http://localhost:3000/admin/scrape-runs/{scrapeRunId}

# List scraped videos
curl http://localhost:3000/videos?channelHandle=@donnys
```

## Future Enhancements

- **Facebook Scraping**: Implement Playwright-based scraping for Facebook pages
- **Scheduled Scrapes**: Add cron job to trigger scrapes automatically
- **Webhook Notifications**: Notify on scrape completion/failure
- **Rate Limiting**: Add delays between requests to avoid hitting platform limits
- **Enrichment**: Extract additional metadata (views, likes, comments)
- **Photo/Event Scraping**: Extend yt-dlp or add separate scrapers for other content types

## Troubleshooting

### yt-dlp Not Found

Ensure yt-dlp is installed and accessible:

```bash
# Install via pip
pip install yt-dlp

# Or via homebrew on macOS
brew install yt-dlp

# Verify installation
which yt-dlp
yt-dlp --version
```

### S3 Connection Errors

Check MinIO is running and accessible:

```bash
curl http://localhost:9000/minio/health/live
```

Access MinIO console at http://localhost:9001 (minioadmin / minioadmin)

### Redis Connection Errors

Verify Redis is running:

```bash
docker-compose ps redis
redis-cli ping
```

### Jobs Not Processing

Check BullMQ queue status by inspecting logs or adding debug endpoints to query job counts.
