import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { TriggerScrapeDto } from './dto/trigger-scrape.dto';
import { ScrapeRunQueryDto } from './dto/scrape-run-query.dto';
import {
  ScrapeRunResponseDto,
  TriggerScrapeResponseDto,
} from './dto/scrape-run-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('scrape')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger a manual scrape job',
    description:
      'Enqueues a BullMQ background job to scrape the specified channel. Admin auth deferred for MVP.',
  })
  @ApiBody({ type: TriggerScrapeDto })
  @ApiResponse({
    status: 202,
    description: 'Scrape job accepted and enqueued',
    type: TriggerScrapeResponseDto,
  })
  async triggerScrape(@Body() dto: TriggerScrapeDto): Promise<TriggerScrapeResponseDto> {
    console.log('[AdminController] POST /admin/scrape', { dto });
    const res = await this.adminService.triggerScrape(dto);
    console.log('[AdminController] POST /admin/scrape response', res);
    return res;
  }

  @Get('scrape-runs')
  @ApiOperation({ summary: 'List scrape run history' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of scrape runs',
  })
  async findAllScrapeRuns(
    @Query() query: ScrapeRunQueryDto,
  ): Promise<PaginatedResponseDto<ScrapeRunResponseDto>> {
    console.log('[AdminController] GET /admin/scrape-runs', { query });
    const res = await this.adminService.findAllScrapeRuns(query);
    console.log('[AdminController] GET /admin/scrape-runs response', { total: res.meta?.total });
    return res;
  }

  @Get('scrape-runs/:id')
  @ApiOperation({ summary: 'Get details of a single scrape run' })
  @ApiParam({ name: 'id', description: 'ScrapeRun CUID' })
  @ApiResponse({ status: 200, description: 'ScrapeRun found', type: ScrapeRunResponseDto })
  @ApiResponse({ status: 404, description: 'ScrapeRun not found' })
  async findOneScrapeRun(@Param('id') id: string): Promise<ScrapeRunResponseDto> {
    console.log('[AdminController] GET /admin/scrape-runs/:id', { id });
    const res = await this.adminService.findOneScrapeRun(id);
    console.log('[AdminController] GET /admin/scrape-runs/:id response', { id: res.id, status: res.status });
    return res;
  }
}
