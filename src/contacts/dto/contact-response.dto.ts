import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Source } from '@prisma/client';

export class ContactResponseDto {
  @ApiProperty({ example: 'clm012jkl' })
  id: string;

  @ApiProperty({ enum: Source, example: 'FACEBOOK' })
  source: Source;

  @ApiProperty({ example: 'donnys.page' })
  channelHandle: string;

  @ApiPropertyOptional({ example: "Donny's Restaurant" })
  pageName?: string;

  @ApiPropertyOptional({ example: '+1-555-0123' })
  phone?: string;

  @ApiPropertyOptional({ example: 'info@donnys.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://donnys.com' })
  website?: string;

  @ApiPropertyOptional({ example: '123 Main St, City, State 12345' })
  address?: string;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ example: '2026-02-18T08:00:00Z' })
  createdAt: Date;
}
