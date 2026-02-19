import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { ContactQueryDto } from './dto/contact-query.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List all contacts with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Paginated list of contacts' })
  async findAll(@Query() query: ContactQueryDto): Promise<PaginatedResponseDto<ContactResponseDto>> {
    console.log('[ContactsController] GET /contacts', { query });
    const res = await this.contactsService.findAll(query);
    console.log('[ContactsController] GET /contacts response', { returned: res.data?.length ?? 0, total: res.meta?.total });
    return res;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact CUID' })
  @ApiResponse({ status: 200, description: 'Contact found', type: ContactResponseDto })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async findOne(@Param('id') id: string): Promise<ContactResponseDto> {
    console.log('[ContactsController] GET /contacts/:id', { id });
    const res = await this.contactsService.findOne(id);
    console.log('[ContactsController] GET /contacts/:id response', { id: res.id });
    return res;
  }
}
