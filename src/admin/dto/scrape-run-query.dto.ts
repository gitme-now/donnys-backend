import { IsOptional, IsEnum, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Source, ScrapeStatus, Trigger } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ScrapeRunQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Source })
  @IsOptional()
  @IsEnum(Source)
  source?: Source;

  @ApiPropertyOptional({ enum: ScrapeStatus })
  @IsOptional()
  @IsEnum(ScrapeStatus)
  status?: ScrapeStatus;

  @ApiPropertyOptional({ enum: Trigger })
  @IsOptional()
  @IsEnum(Trigger)
  trigger?: Trigger;

  @ApiPropertyOptional({ example: '@donnys' })
  @IsOptional()
  @IsString()
  channelHandle?: string;

  @ApiPropertyOptional({ default: 'createdAt', enum: ['createdAt', 'startedAt', 'finishedAt'] })
  @IsOptional()
  @IsIn(['createdAt', 'startedAt', 'finishedAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
