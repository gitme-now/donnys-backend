import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';

export class EventResponseDto {
  @ApiProperty({ example: 'clm789ghi' })
  id: string;

  @ApiProperty({ example: 'event_789' })
  remoteId: string;

  @ApiProperty({ enum: Source, example: 'FACEBOOK' })
  source: Source;

  @ApiProperty({ example: 'Event Title' })
  title: string;

  @ApiPropertyOptional({ example: 'Event description...' })
  description?: string;

  @ApiPropertyOptional({ example: '123 Main St, City' })
  location?: string;

  @ApiPropertyOptional({ example: '2026-03-01T18:00:00Z' })
  startAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-01T22:00:00Z' })
  endAt?: Date;

  @ApiProperty({ example: 'https://facebook.com/events/...' })
  remoteUrl: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/bucket/event.jpg' })
  thumbnailUrl?: string;

  @ApiProperty({ example: 'donnys.page' })
  channelHandle: string;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  updatedAt: Date;
}
