import { IsOptional, IsEnum, IsString, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class PhotoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Source })
  @IsOptional()
  @IsEnum(Source)
  source?: Source;

  @ApiPropertyOptional({ example: 'donnys.page' })
  @IsOptional()
  @IsString()
  channelHandle?: string;

  @ApiPropertyOptional({ example: 'album_456', description: 'Filter by album ID' })
  @IsOptional()
  @IsString()
  albumId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  publishedAfter?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  publishedBefore?: string;

  @ApiPropertyOptional({ default: 'publishedAt', enum: ['publishedAt', 'createdAt'] })
  @IsOptional()
  @IsIn(['publishedAt', 'createdAt'])
  sortBy?: string = 'publishedAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
