import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventQueryDto } from './dto/event-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: EventQueryDto): Promise<PaginatedResponseDto<EventResponseDto>> {
    console.log('[EventsService] findAll called', { query });
    const {
      page = 1,
      limit = 20,
      source,
      channelHandle,
      upcoming,
      startAfter,
      startBefore,
      sortBy = 'startAt',
      sortOrder = 'asc',
    } = query;

    const now = new Date();

    const where: Prisma.EventWhereInput = {
      ...(source && { source }),
      ...(channelHandle && { channelHandle }),
      ...((upcoming || startAfter || startBefore) && {
        startAt: {
          ...(upcoming && { gte: now }),
          ...(startAfter && { gte: new Date(startAfter) }),
          ...(startBefore && { lte: new Date(startBefore) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          remoteId: true,
          source: true,
          title: true,
          description: true,
          location: true,
          startAt: true,
          endAt: true,
          remoteUrl: true,
          thumbnailUrl: true,
          channelHandle: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.event.count({ where }),
    ]);
    console.log('[EventsService] findAll result', { page, limit, returned: data.length, total });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<EventResponseDto> {
    console.log('[EventsService] findOne called', { id });
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        remoteId: true,
        source: true,
        title: true,
        description: true,
        location: true,
        startAt: true,
        endAt: true,
        remoteUrl: true,
        thumbnailUrl: true,
        channelHandle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!event) {
      console.log('[EventsService] findOne not found', { id });
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    console.log('[EventsService] findOne found', { id: event.id });
    return event;
  }
}
