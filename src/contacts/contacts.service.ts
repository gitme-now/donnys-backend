import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContactQueryDto } from './dto/contact-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ContactQueryDto): Promise<PaginatedResponseDto<ContactResponseDto>> {
    console.log('[ContactsService] findAll called', { query });
    const {
      page = 1,
      limit = 20,
      source,
      channelHandle,
      sortBy = 'channelHandle',
      sortOrder = 'asc',
    } = query;

    const where: Prisma.ContactWhereInput = {
      ...(source && { source }),
      ...(channelHandle && { channelHandle }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          source: true,
          channelHandle: true,
          pageName: true,
          phone: true,
          email: true,
          website: true,
          address: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.contact.count({ where }),
    ]);
    console.log('[ContactsService] findAll result', { page, limit, returned: data.length, total });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<ContactResponseDto> {
    console.log('[ContactsService] findOne called', { id });
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        channelHandle: true,
        pageName: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    if (!contact) {
      console.log('[ContactsService] findOne not found', { id });
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    console.log('[ContactsService] findOne found', { id: contact.id });
    return contact;
  }
}
