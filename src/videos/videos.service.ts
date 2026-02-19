import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VideoQueryDto } from './dto/video-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: VideoQueryDto): Promise<PaginatedResponseDto<VideoResponseDto>> {
    console.log('[VideosService] findAll called', { query });
    const {
      page = 1,
      limit = 20,
      source,
      channelHandle,
      publishedAfter,
      publishedBefore,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.VideoWhereInput = {
      ...(source && { source }),
      ...(channelHandle && { channelHandle }),
      ...((publishedAfter || publishedBefore) && {
        publishedAt: {
          ...(publishedAfter && { gte: new Date(publishedAfter) }),
          ...(publishedBefore && { lte: new Date(publishedBefore) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.video.findMany({
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
          remoteUrl: true,
          thumbnailUrl: true,
          duration: true,
          publishedAt: true,
          channelHandle: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.video.count({ where }),
    ]);
    console.log('[VideosService] findAll result', { page, limit, returned: data.length, total });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<VideoResponseDto> {
    console.log('[VideosService] findOne called', { id });
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        remoteId: true,
        source: true,
        title: true,
        description: true,
        remoteUrl: true,
        thumbnailUrl: true,
        duration: true,
        publishedAt: true,
        channelHandle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!video) {
      console.log('[VideosService] findOne not found', { id });
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    console.log('[VideosService] findOne found', { id: video.id });
    return video;
  }
}
