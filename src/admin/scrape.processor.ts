import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { YtDlpService } from '../common/services/ytdlp.service';
import { SCRAPE_QUEUE } from './admin.service';
import { ScrapeType } from './dto/trigger-scrape.dto';
import { Source, ScrapeStatus } from '@prisma/client';

interface ScrapeJobPayload {
  scrapeRunId: string;
  source: Source;
  channelHandle: string;
  types?: ScrapeType[];
}

interface YtDlpVideoEntry {
  id: string;
  title: string;
  description?: string;
  webpage_url: string;
  thumbnail?: string;
  duration?: number;
  upload_date?: string;
  uploader?: string;
  uploader_id?: string;
}

@Injectable()
@Processor(SCRAPE_QUEUE, {
  concurrency: 2, // Process up to 2 jobs concurrently
})
export class ScrapeProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly ytDlpService: YtDlpService,
  ) {
    super();
    console.log('[ScrapeProcessor] initialized');
  }

  async process(job: Job<ScrapeJobPayload>): Promise<void> {
    const { scrapeRunId, source, channelHandle, types } = job.data;

    console.log('[ScrapeProcessor] job started', {
      jobId: job.id,
      scrapeRunId,
      source,
      channelHandle,
      types,
    });

    // Update ScrapeRun to RUNNING
    await this.prisma.scrapeRun.update({
      where: { id: scrapeRunId },
      data: {
        status: ScrapeStatus.RUNNING,
        startedAt: new Date(),
      },
    });
    console.log('[ScrapeProcessor] updated ScrapeRun to RUNNING', {
      scrapeRunId,
    });

    try {
      let itemsProcessed = 0;

      if (source === Source.YOUTUBE) {
        itemsProcessed = await this.scrapeYouTube(channelHandle, types);
      } else if (source === Source.FACEBOOK) {
        // Facebook scraping with Playwright not yet implemented
        console.log('[ScrapeProcessor] Facebook scraping not yet implemented');
        throw new Error('Facebook scraping is not implemented yet');
      }

      // Update ScrapeRun to SUCCESS
      await this.prisma.scrapeRun.update({
        where: { id: scrapeRunId },
        data: {
          status: ScrapeStatus.SUCCESS,
          finishedAt: new Date(),
          itemsProcessed,
        },
      });

      console.log('[ScrapeProcessor] job completed successfully', {
        jobId: job.id,
        scrapeRunId,
        itemsProcessed,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.log('[ScrapeProcessor] job failed', {
        jobId: job.id,
        scrapeRunId,
        error: errorMessage,
        stack: (error as Error).stack,
      });

      // Update ScrapeRun to FAILED
      await this.prisma.scrapeRun.update({
        where: { id: scrapeRunId },
        data: {
          status: ScrapeStatus.FAILED,
          finishedAt: new Date(),
          errorMessage,
        },
      });

      throw error; // Re-throw for BullMQ retry logic
    }
  }

  private async scrapeYouTube(
    channelHandle: string,
    types?: ScrapeType[],
  ): Promise<number> {
    console.log('[ScrapeProcessor] scraping YouTube channel', {
      channelHandle,
      types,
    });

    // Normalize channel handle and build channel URL
    const handle = channelHandle.startsWith('@') ? channelHandle.slice(1) : channelHandle;
    const channelUrl = channelHandle.startsWith('http')
      ? channelHandle
      : `https://www.youtube.com/@${handle}/videos`;

    console.log('[ScrapeProcessor] resolved channel URL', { channelUrl });

    // Run yt-dlp to fetch video metadata
    const args = [
      '--dump-json',
      '--flat-playlist',
      '--playlist-end', '50',
      '--no-warnings',
      channelUrl,
    ];

    console.log('[ScrapeProcessor] executing yt-dlp', { args });

    let stdout: string;
    try {
      stdout = await this.ytDlpService.exec(args);
      console.log('[ScrapeProcessor] yt-dlp execution succeeded', {
        outputLength: stdout.length,
      });
    } catch (error) {
      console.log('[ScrapeProcessor] yt-dlp execution failed', {
        error: (error as Error).message,
      });
      throw new Error(`yt-dlp failed: ${(error as Error).message}`);
    }

    // Parse JSON lines
    const lines = stdout.trim().split('\n').filter(Boolean);
    console.log('[ScrapeProcessor] parsed yt-dlp output', {
      lineCount: lines.length,
    });

    const videos: YtDlpVideoEntry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        videos.push(entry);
      } catch (parseError) {
        console.log('[ScrapeProcessor] failed to parse JSON line', {
          line: line.substring(0, 100),
          error: (parseError as Error).message,
        });
      }
    }

    console.log('[ScrapeProcessor] fetched videos from yt-dlp', {
      count: videos.length,
    });

    // Process each video
    let processedCount = 0;
    for (const video of videos) {
      try {
        await this.processYouTubeVideo(video, channelHandle);
        processedCount++;
      } catch (error) {
        console.log('[ScrapeProcessor] failed to process video', {
          videoId: video.id,
          error: (error as Error).message,
        });
        // Continue processing other videos
      }
    }

    console.log('[ScrapeProcessor] YouTube scrape completed', {
      totalVideos: videos.length,
      processedCount,
    });

    return processedCount;
  }

  private async processYouTubeVideo(
    video: YtDlpVideoEntry,
    channelHandle: string,
  ): Promise<void> {
    console.log('[ScrapeProcessor] processing video', {
      videoId: video.id,
      title: video.title?.substring(0, 50),
    });

    // Upload thumbnail to S3 if available
    let thumbnailUrl: string | null = null;
    if (video.thumbnail) {
      try {
        thumbnailUrl = await this.s3Service.downloadAndUploadThumbnail(
          video.thumbnail,
          `thumbnails/youtube/${channelHandle}`,
        );
        console.log('[ScrapeProcessor] thumbnail uploaded', {
          videoId: video.id,
          thumbnailUrl,
        });
      } catch (error) {
        console.log('[ScrapeProcessor] thumbnail upload failed', {
          videoId: video.id,
          error: (error as Error).message,
        });
        // Continue without thumbnail
      }
    }

    // Parse upload date (YYYYMMDD format)
    let publishedAt: Date | null = null;
    if (video.upload_date) {
      const year = parseInt(video.upload_date.substring(0, 4));
      const month = parseInt(video.upload_date.substring(4, 6)) - 1;
      const day = parseInt(video.upload_date.substring(6, 8));
      publishedAt = new Date(year, month, day);
    }

    // Upsert video to database
    const upserted = await this.prisma.video.upsert({
      where: {
        remoteId_source: {
          remoteId: video.id,
          source: Source.YOUTUBE,
        },
      },
      create: {
        remoteId: video.id,
        source: Source.YOUTUBE,
        title: video.title || 'Untitled',
        description: video.description,
        remoteUrl: video.webpage_url,
        thumbnailUrl,
        duration: video.duration,
        publishedAt,
        channelHandle,
        rawMeta: video as any,
      },
      update: {
        title: video.title || 'Untitled',
        description: video.description,
        remoteUrl: video.webpage_url,
        thumbnailUrl: thumbnailUrl || undefined,
        duration: video.duration,
        publishedAt: publishedAt || undefined,
        rawMeta: video as any,
        updatedAt: new Date(),
      },
    });

    console.log('[ScrapeProcessor] video upserted', {
      id: upserted.id,
      remoteId: video.id,
      title: upserted.title.substring(0, 50),
    });
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log('[ScrapeProcessor] worker picked up job', {
      jobId: job.id,
      scrapeRunId: job.data.scrapeRunId,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log('[ScrapeProcessor] worker completed job', {
      jobId: job.id,
      scrapeRunId: job.data.scrapeRunId,
      finishedOn: job.finishedOn,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.log('[ScrapeProcessor] worker failed job', {
      jobId: job.id,
      scrapeRunId: job.data.scrapeRunId,
      error: error.message,
      attemptsMade: job.attemptsMade,
      attemptsLimit: job.opts.attempts,
    });
  }
}
