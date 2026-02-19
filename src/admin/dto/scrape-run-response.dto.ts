import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Source, ScrapeStatus, Trigger } from '@prisma/client';

export class ScrapeRunResponseDto {
  @ApiProperty({ example: 'clm345mno' })
  id: string;

  @ApiProperty({ enum: Source, example: 'YOUTUBE' })
  source: Source;

  @ApiProperty({ example: '@donnys' })
  channelHandle: string;

  @ApiProperty({ enum: ScrapeStatus, example: 'SUCCESS' })
  status: ScrapeStatus;

  @ApiProperty({ enum: Trigger, example: 'MANUAL' })
  trigger: Trigger;

  @ApiPropertyOptional({ example: '2026-02-18T09:00:00Z' })
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2026-02-18T09:05:32Z' })
  finishedAt?: Date;

  @ApiPropertyOptional({ example: 42 })
  itemsProcessed?: number;

  @ApiPropertyOptional({ example: null })
  errorMessage?: string;

  @ApiProperty({ example: '2026-02-18T09:00:00Z' })
  createdAt: Date;
}

export class TriggerScrapeResponseDto {
  @ApiProperty({ example: 'clm345mno' })
  scrapeRunId: string;

  @ApiProperty({ enum: ScrapeStatus, example: 'PENDING' })
  status: ScrapeStatus;

  @ApiProperty({ example: 'Scrape job enqueued' })
  message: string;
}
