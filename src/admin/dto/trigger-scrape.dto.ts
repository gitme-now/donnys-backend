import { IsEnum, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';

export type ScrapeType = 'videos' | 'photos' | 'events' | 'contacts';

export class TriggerScrapeDto {
  @ApiProperty({ enum: Source, description: 'Platform to scrape', example: 'YOUTUBE' })
  @IsEnum(Source)
  source: Source;

  @ApiProperty({ description: 'Channel handle to scrape', example: '@donnys' })
  @IsString()
  channelHandle: string;

  @ApiPropertyOptional({
    description: 'Content types to scrape. Defaults to applicable types for the source.',
    enum: ['videos', 'photos', 'events', 'contacts'],
    isArray: true,
    example: ['videos', 'photos'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['videos', 'photos', 'events', 'contacts'], { each: true })
  types?: ScrapeType[];
}
