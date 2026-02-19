import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { VideoQueryDto } from './dto/video-query.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @ApiOperation({ summary: 'List all videos with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of videos',
  })
  async findAll(@Query() query: VideoQueryDto): Promise<PaginatedResponseDto<VideoResponseDto>> {
    console.log('[VideosController] GET /videos', { query });
    const res = await this.videosService.findAll(query);
    console.log('[VideosController] GET /videos response', { returned: res.data?.length ?? 0, total: res.meta?.total });
    return res;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single video by ID' })
  @ApiParam({ name: 'id', description: 'Video CUID' })
  @ApiResponse({ status: 200, description: 'Video found', type: VideoResponseDto })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async findOne(@Param('id') id: string): Promise<VideoResponseDto> {
    console.log('[VideosController] GET /videos/:id', { id });
    const res = await this.videosService.findOne(id);
    console.log('[VideosController] GET /videos/:id response', { id: res.id });
    return res;
  }
}
