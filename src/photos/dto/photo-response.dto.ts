import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';

export class PhotoResponseDto {
  @ApiProperty({ example: 'clm456def' })
  id: string;

  @ApiProperty({ example: 'photo_123' })
  remoteId: string;

  @ApiProperty({ enum: Source, example: 'FACEBOOK' })
  source: Source;

  @ApiProperty({ example: 'https://facebook.com/photo/...' })
  remoteUrl: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/bucket/photo.jpg' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'Photo caption' })
  caption?: string;

  @ApiPropertyOptional({ example: 'album_456' })
  albumId?: string;

  @ApiPropertyOptional({ example: '2026-02-14T15:30:00Z' })
  publishedAt?: Date;

  @ApiProperty({ example: 'donnys.page' })
  channelHandle: string;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  updatedAt: Date;
}
