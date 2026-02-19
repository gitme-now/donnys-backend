import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { TriggerScrapeDto } from './dto/trigger-scrape.dto';
import { ScrapeRunQueryDto } from './dto/scrape-run-query.dto';
import {
  ScrapeRunResponseDto,
  TriggerScrapeResponseDto,
} from './dto/scrape-run-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Prisma, ScrapeStatus, Trigger } from '@prisma/client';

export const SCRAPE_QUEUE = 'scrape';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SCRAPE_QUEUE) private readonly scrapeQueue: Queue,
  ) {}

  async triggerScrape(dto: TriggerScrapeDto): Promise<TriggerScrapeResponseDto> {
    console.log('[AdminService] triggerScrape called', { dto });
    // Create a ScrapeRun record in PENDING state
    const scrapeRun = await this.prisma.scrapeRun.create({
      data: {
        source: dto.source,
        channelHandle: dto.channelHandle,
        status: ScrapeStatus.PENDING,
        trigger: Trigger.MANUAL,
      },
    });
    console.log('[AdminService] created ScrapeRun', { id: scrapeRun.id, source: scrapeRun.source, channelHandle: scrapeRun.channelHandle });

    // Enqueue the BullMQ job
    try {
      await this.scrapeQueue.add(
        'scrape-channel',
        {
          scrapeRunId: scrapeRun.id,
          source: dto.source,
          channelHandle: dto.channelHandle,
          types: dto.types,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
      console.log('[AdminService] enqueue succeeded', { scrapeRunId: scrapeRun.id });
    } catch (err) {
      console.log('[AdminService] enqueue failed', { scrapeRunId: scrapeRun.id, error: err });
      throw err;
    }

    const response = {
      scrapeRunId: scrapeRun.id,
      status: ScrapeStatus.PENDING,
      message: 'Scrape job enqueued',
    };
    console.log('[AdminService] triggerScrape returning', response);
    return response;
  }

  async findAllScrapeRuns(
    query: ScrapeRunQueryDto,
  ): Promise<PaginatedResponseDto<ScrapeRunResponseDto>> {
    const {
      page = 1,
      limit = 20,
      source,
      status,
      trigger,
      channelHandle,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ScrapeRunWhereInput = {
      ...(source && { source }),
      ...(status && { status }),
      ...(trigger && { trigger }),
      ...(channelHandle && { channelHandle }),
    };

    const [data, total] = await Promise.all([
      this.prisma.scrapeRun.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          source: true,
          channelHandle: true,
          status: true,
          trigger: true,
          startedAt: true,
          finishedAt: true,
          itemsProcessed: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
      this.prisma.scrapeRun.count({ where }),
    ]);

    console.log('[AdminService] findAllScrapeRuns result', { page, limit, returned: data.length, total });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOneScrapeRun(id: string): Promise<ScrapeRunResponseDto> {
    const run = await this.prisma.scrapeRun.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        channelHandle: true,
        status: true,
        trigger: true,
        startedAt: true,
        finishedAt: true,
        itemsProcessed: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    if (!run) {
      console.log('[AdminService] findOneScrapeRun not found', { id });
      throw new NotFoundException(`ScrapeRun with ID ${id} not found`);
    }
    console.log('[AdminService] findOneScrapeRun found', { id: run.id, status: run.status });
    return run;
  }
}
