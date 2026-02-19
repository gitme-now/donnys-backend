import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PhotoQueryDto } from './dto/photo-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PhotoResponseDto } from './dto/photo-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PhotoQueryDto): Promise<PaginatedResponseDto<PhotoResponseDto>> {
    console.log('[PhotosService] findAll called', { query });
    const {
      page = 1,
      limit = 20,
      source,
      channelHandle,
      albumId,
      publishedAfter,
      publishedBefore,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.PhotoWhereInput = {
      ...(source && { source }),
      ...(channelHandle && { channelHandle }),
      ...(albumId && { albumId }),
      ...((publishedAfter || publishedBefore) && {
        publishedAt: {
          ...(publishedAfter && { gte: new Date(publishedAfter) }),
          ...(publishedBefore && { lte: new Date(publishedBefore) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.photo.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          remoteId: true,
          source: true,
          remoteUrl: true,
          thumbnailUrl: true,
          caption: true,
          albumId: true,
          publishedAt: true,
          channelHandle: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.photo.count({ where }),
    ]);
    console.log('[PhotosService] findAll result', { page, limit, returned: data.length, total });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<PhotoResponseDto> {
    console.log('[PhotosService] findOne called', { id });
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      select: {
        id: true,
        remoteId: true,
        source: true,
        remoteUrl: true,
        thumbnailUrl: true,
        caption: true,
        albumId: true,
        publishedAt: true,
        channelHandle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!photo) {
      console.log('[PhotosService] findOne not found', { id });
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    console.log('[PhotosService] findOne found', { id: photo.id });
    return photo;
  }
}
