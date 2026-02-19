import { IsOptional, IsEnum, IsString, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class VideoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Source, description: 'Filter by source platform' })
  @IsOptional()
  @IsEnum(Source)
  source?: Source;

  @ApiPropertyOptional({ example: '@donnys', description: 'Filter by channel handle' })
  @IsOptional()
  @IsString()
  channelHandle?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', description: 'Filter videos published after this date' })
  @IsOptional()
  @IsDateString()
  publishedAfter?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'Filter videos published before this date' })
  @IsOptional()
  @IsDateString()
  publishedBefore?: string;

  @ApiPropertyOptional({ default: 'publishedAt', enum: ['publishedAt', 'title', 'duration', 'createdAt'] })
  @IsOptional()
  @IsIn(['publishedAt', 'title', 'duration', 'createdAt'])
  sortBy?: string = 'publishedAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
