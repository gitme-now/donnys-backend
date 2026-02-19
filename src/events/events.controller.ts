import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventQueryDto } from './dto/event-query.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of events' })
  async findAll(@Query() query: EventQueryDto): Promise<PaginatedResponseDto<EventResponseDto>> {
    console.log('[EventsController] GET /events', { query });
    const res = await this.eventsService.findAll(query);
    console.log('[EventsController] GET /events response', { returned: res.data?.length ?? 0, total: res.meta?.total });
    return res;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiParam({ name: 'id', description: 'Event CUID' })
  @ApiResponse({ status: 200, description: 'Event found', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string): Promise<EventResponseDto> {
    console.log('[EventsController] GET /events/:id', { id });
    const res = await this.eventsService.findOne(id);
    console.log('[EventsController] GET /events/:id response', { id: res.id });
    return res;
  }
}
