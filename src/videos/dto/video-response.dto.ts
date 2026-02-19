import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';

export class VideoResponseDto {
  @ApiProperty({ example: 'clm123abc' })
  id: string;

  @ApiProperty({ example: 'dQw4w9WgXcQ' })
  remoteId: string;

  @ApiProperty({ enum: Source, example: 'YOUTUBE' })
  source: Source;

  @ApiProperty({ example: 'Video Title' })
  title: string;

  @ApiPropertyOptional({ example: 'Video description...' })
  description?: string;

  @ApiProperty({ example: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
  remoteUrl: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/bucket/thumb.jpg' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 240 })
  duration?: number;

  @ApiPropertyOptional({ example: '2026-02-15T10:00:00Z' })
  publishedAt?: Date;

  @ApiProperty({ example: '@donnys' })
  channelHandle: string;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  updatedAt: Date;
}
