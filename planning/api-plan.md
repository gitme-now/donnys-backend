# API Implementation Plan

## Overview
REST API layer for Donny's Backend Service providing public endpoints for videos/photos/events/contacts and admin endpoints for scrape management. Built with NestJS, following resource-based module architecture with comprehensive Swagger documentation.

---

## API Endpoints

### Public Endpoints

#### Videos API
- **GET /videos** - List videos with pagination and filtering
  - Query params: `page`, `limit`, `sortBy`, `sortOrder`, `source`, `channelHandle`, `publishedAfter`, `publishedBefore`
  - Returns: Paginated response with video metadata
  - Default sort: `publishedAt DESC`

- **GET /videos/:id** - Get single video by ID
  - Returns: Video metadata or 404

#### Photos API
- **GET /photos** - List photos with pagination and filtering
  - Query params: `page`, `limit`, `sortBy`, `sortOrder`, `source`, `channelHandle`, `albumId`, `publishedAfter`, `publishedBefore`
  - Returns: Paginated response with photo metadata
  - Default sort: `publishedAt DESC`

- **GET /photos/:id** - Get single photo by ID
  - Returns: Photo metadata or 404

#### Events API
- **GET /events** - List events with pagination and filtering
  - Query params: `page`, `limit`, `sortBy`, `sortOrder`, `source`, `channelHandle`, `upcoming`, `startAfter`, `startBefore`
  - Returns: Paginated response with event metadata
  - Default sort: `startAt ASC`

- **GET /events/:id** - Get single event by ID
  - Returns: Event metadata or 404

#### Contacts API
- **GET /contacts** - List contacts with pagination and filtering
  - Query params: `page`, `limit`, `sortBy`, `sortOrder`, `source`, `channelHandle`
  - Returns: Paginated response with contact information
  - Default sort: `channelHandle ASC`

- **GET /contacts/:id** - Get single contact by ID
  - Returns: Contact information or 404

### Admin Endpoints

#### Scrape Management
- **POST /admin/scrape** - Trigger manual scrape job
  - Body: `{ source: 'YOUTUBE' | 'FACEBOOK', channelHandle: string, types?: ['videos', 'photos', 'events', 'contacts'] }`
  - Returns: `{ scrapeRunId: string, status: 'PENDING', message: 'Scrape job enqueued' }` (202 Accepted)
  - Enqueues BullMQ job for background processing

- **GET /admin/scrape-runs** - List scrape run history
  - Query params: `page`, `limit`, `status`, `source`, `trigger`, `channelHandle`
  - Returns: Paginated list of ScrapeRun records

- **GET /admin/scrape-runs/:id** - Get scrape run details
  - Returns: Full ScrapeRun details including error messages

### Health Check
- **GET /health** - Service health status
  - Returns: `{ status: 'ok', timestamp: ISO8601, database: 'connected', redis: 'connected' }`
  - Uses @nestjs/terminus for health checks

---

## Response Formats

### Paginated Response Structure
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Video Response DTO
```json
{
  "id": "clm123abc",
  "remoteId": "dQw4w9WgXcQ",
  "source": "YOUTUBE",
  "title": "Video Title",
  "description": "Video description...",
  "remoteUrl": "https://youtube.com/watch?v=...",
  "thumbnailUrl": "https://s3.amazonaws.com/bucket/thumb.jpg",
  "duration": 240,
  "publishedAt": "2026-02-15T10:00:00Z",
  "channelHandle": "@donnys",
  "createdAt": "2026-02-18T08:00:00Z",
  "updatedAt": "2026-02-18T08:00:00Z"
}
```
*Note: `rawMeta` excluded from response DTOs*

### Photo Response DTO
```json
{
  "id": "clm456def",
  "remoteId": "photo_123",
  "source": "FACEBOOK",
  "remoteUrl": "https://facebook.com/photo/...",
  "thumbnailUrl": "https://s3.amazonaws.com/bucket/photo.jpg",
  "caption": "Photo caption",
  "albumId": "album_456",
  "publishedAt": "2026-02-14T15:30:00Z",
  "channelHandle": "donnys.page",
  "createdAt": "2026-02-18T08:00:00Z",
  "updatedAt": "2026-02-18T08:00:00Z"
}
```

### Event Response DTO
```json
{
  "id": "clm789ghi",
  "remoteId": "event_789",
  "source": "FACEBOOK",
  "title": "Event Title",
  "description": "Event description...",
  "location": "123 Main St, City",
  "startAt": "2026-03-01T18:00:00Z",
  "endAt": "2026-03-01T22:00:00Z",
  "remoteUrl": "https://facebook.com/events/...",
  "thumbnailUrl": "https://s3.amazonaws.com/bucket/event.jpg",
  "channelHandle": "donnys.page",
  "createdAt": "2026-02-18T08:00:00Z",
  "updatedAt": "2026-02-18T08:00:00Z"
}
```

### Contact Response DTO
```json
{
  "id": "clm012jkl",
  "source": "FACEBOOK",
  "channelHandle": "donnys.page",
  "pageName": "Donny's Restaurant",
  "phone": "+1-555-0123",
  "email": "info@donnys.com",
  "website": "https://donnys.com",
  "address": "123 Main St, City, State 12345",
  "updatedAt": "2026-02-18T08:00:00Z",
  "createdAt": "2026-02-18T08:00:00Z"
}
```

### Scrape Run Response DTO
```json
{
  "id": "clm345mno",
  "source": "YOUTUBE",
  "channelHandle": "@donnys",
  "status": "SUCCESS",
  "trigger": "MANUAL",
  "startedAt": "2026-02-18T09:00:00Z",
  "finishedAt": "2026-02-18T09:05:32Z",
  "itemsProcessed": 42,
  "errorMessage": null,
  "createdAt": "2026-02-18T09:00:00Z"
}
```

### Error Response
```json
{
  "statusCode": 404,
  "message": "Video not found",
  "error": "Not Found",
  "timestamp": "2026-02-18T10:30:00Z",
  "path": "/videos/invalid-id"
}
```

---

## Implementation Structure

### Module Organization
```
src/
├── main.ts                      # Application entry point, Swagger config
├── app.module.ts                # Root module, imports all feature modules
│
├── config/                      # Configuration module
│   └── configuration.ts         # Environment variable validation
│
├── database/                    # Database module
│   ├── prisma.module.ts         # Global PrismaModule
│   └── prisma.service.ts        # PrismaService wrapper
│
├── common/                      # Shared utilities
│   ├── dto/
│   │   ├── pagination-query.dto.ts     # Base pagination query params
│   │   └── paginated-response.dto.ts   # Generic paginated response
│   ├── filters/
│   │   └── http-exception.filter.ts    # Global exception filter
│   └── interceptors/
│       └── transform.interceptor.ts    # Response transformation
│
├── videos/                      # Videos feature module
│   ├── videos.module.ts
│   ├── videos.controller.ts     # GET /videos, GET /videos/:id
│   ├── videos.service.ts        # Business logic, Prisma queries
│   └── dto/
│       ├── video-query.dto.ts   # Query params with validation
│       └── video-response.dto.ts # Response DTO
│
├── photos/                      # Photos feature module
│   ├── photos.module.ts
│   ├── photos.controller.ts
│   ├── photos.service.ts
│   └── dto/
│       ├── photo-query.dto.ts
│       └── photo-response.dto.ts
│
├── events/                      # Events feature module
│   ├── events.module.ts
│   ├── events.controller.ts
│   ├── events.service.ts
│   └── dto/
│       ├── event-query.dto.ts
│       └── event-response.dto.ts
│
├── contacts/                    # Contacts feature module
│   ├── contacts.module.ts
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   └── dto/
│       ├── contact-query.dto.ts
│       └── contact-response.dto.ts
│
├── admin/                       # Admin feature module
│   ├── admin.module.ts
│   ├── admin.controller.ts      # POST /admin/scrape, GET /admin/scrape-runs
│   ├── admin.service.ts         # Job enqueueing, run history
│   └── dto/
│       ├── trigger-scrape.dto.ts
│       └── scrape-run-response.dto.ts
│
└── health/                      # Health check module
    ├── health.module.ts
    └── health.controller.ts     # GET /health
```

### Key Dependencies
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/bull": "^10.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/terminus": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "bullmq": "^5.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-node": "^10.0.0"
  }
}
```

---

## Configuration

### Environment Variables
```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/donnys

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# S3 Storage
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=donnys-thumbnails
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# Scraping
YT_DLP_PATH=/usr/local/bin/yt-dlp

# Scheduling
CRON_TIMEZONE=America/Chicago
CRON_SCHEDULE=0 9 * * *

# API
SWAGGER_ENABLED=true
CORS_ENABLED=true
```

### Validation Schema (ConfigModule)
```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION || 'us-east-1',
  },
  scraping: {
    ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
    cronTimezone: process.env.CRON_TIMEZONE || 'America/Chicago',
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
  },
});
```

---

## API Design Decisions

### Pagination
- **Default page**: 1
- **Default limit**: 20
- **Maximum limit**: 100
- **Query params**: `?page=2&limit=50`
- **Implementation**: Prisma `skip` and `take`

### Sorting
- **Videos/Photos**: Default `publishedAt DESC`
- **Events**: Default `startAt ASC` (upcoming first)
- **Contacts**: Default `channelHandle ASC`
- **Query params**: `?sortBy=title&sortOrder=asc`
- **Allowed sort fields**: Defined per resource

### Filtering
- **Common filters**: `source`, `channelHandle`
- **Date filters**: `publishedAfter`, `publishedBefore` (ISO 8601)
- **Event filters**: `upcoming=true` (filters `startAt >= now`)
- **Photo filters**: `albumId`
- **Query param examples**: `?source=YOUTUBE&channelHandle=@donnys`

### Response Structure
- **Success responses**: Return data directly or wrapped in pagination
- **Error responses**: Standard NestJS HttpException format
- **Exclude internal fields**: `rawMeta` not exposed in DTOs
- **Date format**: ISO 8601 strings
- **ID format**: Prisma CUID strings

### Swagger Documentation
- **Endpoint**: `/api/docs`
- **Title**: "Donny's Backend API"
- **Version**: From package.json
- **Tags**: Videos, Photos, Events, Contacts, Admin, Health
- **All DTOs**: Decorated with `@ApiProperty` including examples
- **Controllers**: Decorated with `@ApiTags`, `@ApiResponse`, `@ApiOperation`
- **Auth note**: Document that admin endpoints are unprotected in MVP

### Error Handling
- **404**: Resource not found (invalid ID)
- **400**: Validation error (invalid query params)
- **422**: Unprocessable entity (invalid request body)
- **500**: Internal server error (logged, generic message to client)
- **Prisma errors**: Map to appropriate HTTP status codes

### CORS
- **Enabled for MVP**: Allow all origins
- **Production**: Restrict to specific frontend domains
- **Configured in**: `main.ts` bootstrap function

### Rate Limiting
- **MVP**: Deferred
- **Future**: Implement with @nestjs/throttler
- **Considerations**: Per-IP limits, admin endpoint protection

### Authentication/Authorization
- **MVP**: Deferred (admin endpoints unprotected)
- **Future**: Implement JWT or API key auth for admin routes
- **Note**: Document security requirement before production

---

## Swagger Configuration Example

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  app.enableCors();

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Donny's Backend API")
    .setDescription(
      'API for managing scraped content from YouTube and Facebook channels',
    )
    .setVersion('1.0')
    .addTag('Videos', 'Video content endpoints')
    .addTag('Photos', 'Photo content endpoints')
    .addTag('Events', 'Event endpoints')
    .addTag('Contacts', 'Contact information endpoints')
    .addTag('Admin', 'Administrative endpoints (scrape management)')
    .addTag('Health', 'Health check endpoint')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
```

---

## DTO Example: Video Query

```typescript
// src/videos/dto/video-query.dto.ts
import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Source } from '@prisma/client';

export class VideoQueryDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ enum: Source, required: false })
  @IsOptional()
  @IsEnum(Source)
  source?: Source;

  @ApiProperty({ required: false, example: '@donnys' })
  @IsOptional()
  @IsString()
  channelHandle?: string;

  @ApiProperty({ required: false, example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  publishedAfter?: string;

  @ApiProperty({ required: false, example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  publishedBefore?: string;

  @ApiProperty({ required: false, default: 'publishedAt', enum: ['publishedAt', 'title', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'publishedAt';

  @ApiProperty({ required: false, default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

---

## Testing Strategy

### Unit Tests
- Test each service method in isolation
- Mock PrismaService
- Test pagination logic
- Test filtering and sorting logic
- Test error handling (not found, validation)

### Integration Tests
- Test controller + service + database
- Use test database or in-memory SQLite
- Test full request/response cycle
- Test validation pipe behavior

### E2E Tests
- Test full API endpoints
- Test Swagger documentation generation
- Test CORS and global filters
- Test health check endpoint

### Example Test Structure
```typescript
// src/videos/videos.service.spec.ts
describe('VideosService', () => {
  let service: VideosService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VideosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return paginated videos', async () => {
    // Test implementation
  });

  it('should filter by source', async () => {
    // Test implementation
  });

  it('should throw NotFoundException for invalid id', async () => {
    // Test implementation
  });
});
```

---

## Verification Checklist

### Development Setup
- [ ] NestJS application starts successfully
- [ ] Prisma client generated and connected
- [ ] Environment variables loaded
- [ ] Swagger UI accessible at `/api/docs`

### Endpoint Testing
- [ ] GET /videos returns empty array initially
- [ ] GET /videos?page=2&limit=10 respects pagination
- [ ] GET /videos?source=YOUTUBE filters correctly
- [ ] GET /videos/:id returns 404 for invalid ID
- [ ] GET /photos works similarly
- [ ] GET /events works similarly
- [ ] GET /contacts works similarly
- [ ] POST /admin/scrape accepts valid payload, returns 202
- [ ] GET /admin/scrape-runs returns empty array initially
- [ ] GET /health returns 200 with status object

### Response Validation
- [ ] All responses match defined DTO structure
- [ ] Dates are ISO 8601 format
- [ ] Pagination meta includes total, page, limit, totalPages
- [ ] Error responses have consistent format
- [ ] rawMeta field excluded from responses

### Swagger Documentation
- [ ] All endpoints documented
- [ ] Request/response examples present
- [ ] Query parameters documented
- [ ] DTOs show validation rules
- [ ] Tags properly categorize endpoints

### Error Handling
- [ ] 404 for non-existent resources
- [ ] 400 for validation errors
- [ ] Global exception filter formats errors consistently
- [ ] Prisma errors mapped to HTTP codes

---

## Future Enhancements (Post-MVP)

1. **Authentication & Authorization**
   - JWT tokens for admin endpoints
   - API key support
   - Role-based access control

2. **Advanced Filtering**
   - Full-text search across title/description
   - Multiple filter combinations
   - Complex date range queries

3. **Performance Optimizations**
   - Redis caching for GET endpoints
   - Database query optimization
   - Response compression

4. **Rate Limiting**
   - Per-IP rate limits
   - Different limits for public vs admin
   - Rate limit headers in responses

5. **Analytics**
   - Endpoint usage metrics
   - Popular content tracking
   - Scrape success rates

6. **Webhooks**
   - Notify on scrape completion
   - Notify on new content
   - Configurable webhook URLs

7. **Batch Operations**
   - Bulk scrape multiple channels
   - Batch delete old content
   - Export data endpoints

8. **GraphQL Alternative**
   - GraphQL API alongside REST
   - Flexible querying
   - Reduced over-fetching

---

## Notes
- Admin authentication is **deferred for MVP** - secure before public deployment
- All thumbnails served via S3 URLs (pre-signed or public bucket)
- Scraping implementation details separate from API layer
- API focuses on data retrieval; scraping happens asynchronously via BullMQ
- Timezone-aware dates handled by Postgres and Prisma
- CUID IDs used for all resources (from Prisma schema)
