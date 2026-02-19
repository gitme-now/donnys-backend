import { IsOptional, IsEnum, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ContactQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Source })
  @IsOptional()
  @IsEnum(Source)
  source?: Source;

  @ApiPropertyOptional({ example: 'donnys.page' })
  @IsOptional()
  @IsString()
  channelHandle?: string;

  @ApiPropertyOptional({ default: 'channelHandle', enum: ['channelHandle', 'pageName', 'createdAt'] })
  @IsOptional()
  @IsIn(['channelHandle', 'pageName', 'createdAt'])
  sortBy?: string = 'channelHandle';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
