import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { PhotoQueryDto } from './dto/photo-query.dto';
import { PhotoResponseDto } from './dto/photo-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get()
  @ApiOperation({ summary: 'List all photos with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of photos' })
  async findAll(@Query() query: PhotoQueryDto): Promise<PaginatedResponseDto<PhotoResponseDto>> {
    console.log('[PhotosController] GET /photos', { query });
    const res = await this.photosService.findAll(query);
    console.log('[PhotosController] GET /photos response', { returned: res.data?.length ?? 0, total: res.meta?.total });
    return res;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single photo by ID' })
  @ApiParam({ name: 'id', description: 'Photo CUID' })
  @ApiResponse({ status: 200, description: 'Photo found', type: PhotoResponseDto })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async findOne(@Param('id') id: string): Promise<PhotoResponseDto> {
    console.log('[PhotosController] GET /photos/:id', { id });
    const res = await this.photosService.findOne(id);
    console.log('[PhotosController] GET /photos/:id response', { id: res.id });
    return res;
  }
}
