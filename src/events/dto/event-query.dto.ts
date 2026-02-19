import { IsOptional, IsEnum, IsString, IsDateString, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class EventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Source })
  @IsOptional()
  @IsEnum(Source)
  source?: Source;

  @ApiPropertyOptional({ example: 'donnys.page' })
  @IsOptional()
  @IsString()
  channelHandle?: string;

  @ApiPropertyOptional({ description: 'Filter only upcoming events (startAt >= now)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  upcoming?: boolean;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startAfter?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  startBefore?: string;

  @ApiPropertyOptional({ default: 'startAt', enum: ['startAt', 'title', 'createdAt'] })
  @IsOptional()
  @IsIn(['startAt', 'title', 'createdAt'])
  sortBy?: string = 'startAt';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
