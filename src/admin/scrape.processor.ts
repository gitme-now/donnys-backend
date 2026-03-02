import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { YtDlpService } from '../common/services/ytdlp.service';
import { PlaywrightService } from '../common/services/playwright.service';
import { SCRAPE_QUEUE } from './admin.service';
import { ScrapeType } from './dto/trigger-scrape.dto';
import { Source, ScrapeStatus } from '@prisma/client';
import { Page } from 'playwright';

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
    private readonly playwrightService: PlaywrightService,
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
      } 
      // else if (source === Source.FACEBOOK) {
      //   itemsProcessed = await this.scrapeFacebook(channelHandle, types);
      // }

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
    // Note: do NOT use --flat-playlist here — it omits thumbnail, duration,
    // description, and upload_date, which causes thumbnailUrl to always be null.
    const args = [
      '--dump-json',
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
    // Upload thumbnail to S3 if available (centralized helper)
    const thumbnailUrl = await this.uploadThumbnail(
      video.thumbnail,
      `thumbnails/youtube/${channelHandle}`,
      'video',
      video.id,
    );

    // Parse upload date (YYYYMMDD format)
    const publishedAt = this.parseYtUploadDate(video.upload_date);

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

  private async uploadThumbnail(
    url: string | undefined,
    destDir: string,
    kind: string,
    id?: string,
  ): Promise<string | null> {
    if (!url) return null;
    try {
      const uploaded = await this.s3Service.downloadAndUploadThumbnail(url, destDir);
      console.log('[ScrapeProcessor] thumbnail uploaded', {
        kind,
        id,
        thumbnailUrl: uploaded,
      });
      return uploaded;
    } catch (error) {
      console.log('[ScrapeProcessor] thumbnail upload failed', {
        kind,
        id,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private parseYtUploadDate(uploadDate?: string): Date | null {
    if (!uploadDate) return null;
    try {
      const year = parseInt(uploadDate.substring(0, 4));
      const month = parseInt(uploadDate.substring(4, 6)) - 1;
      const day = parseInt(uploadDate.substring(6, 8));
      return new Date(year, month, day);
    } catch (err) {
      console.log('[ScrapeProcessor] failed to parse upload_date', {
        uploadDate,
        error: (err as Error).message,
      });
      return null;
    }
  }

  private async scrapeFacebook(
    channelHandle: string,
    types?: ScrapeType[],
  ): Promise<number> {
    console.log('[ScrapeProcessor] scraping Facebook page', {
      channelHandle,
      types,
    });

    // Default to all types if none specified
    const scrapeTypes = types || ['videos', 'photos', 'events', 'contacts'];
    let totalProcessed = 0;

    // Create browser context
    const context = await this.playwrightService.createContext();
    const page = await context.newPage();

    try {
      // Normalize Facebook URL
      let baseUrl: string;
      if (channelHandle.startsWith('http')) {
        baseUrl = channelHandle;
      } else if (/^\d+$/.test(channelHandle)) {
        // Numeric ID
        baseUrl = `https://www.facebook.com/profile.php?id=${channelHandle}`;
      } else {
        // Username/handle
        baseUrl = `https://www.facebook.com/${channelHandle}`;
      }

      console.log('[ScrapeProcessor] resolved Facebook URL', { baseUrl });

      // Navigate to base page first to check for login wall
      await this.playwrightService.navigateWithRetry(page, baseUrl);
      await page.waitForTimeout(2000);

      const hasLoginWall = await this.playwrightService.hasLoginWall(page);
      if (hasLoginWall) {
        throw new Error(
          'Facebook requires login to access this page. Public scraping is not possible.',
        );
      }

      // Scrape each requested type
      for (const type of scrapeTypes) {
        try {
          let count = 0;
          switch (type) {
            case 'videos':
              count = await this.scrapeFacebookVideos(
                page,
                baseUrl,
                channelHandle,
              );
              break;
            case 'photos':
              count = await this.scrapeFacebookPhotos(
                page,
                baseUrl,
                channelHandle,
              );
              break;
            case 'events':
              count = await this.scrapeFacebookEvents(
                page,
                baseUrl,
                channelHandle,
              );
              break;
            case 'contacts':
              count = await this.scrapeFacebookContacts(
                page,
                baseUrl,
                channelHandle,
              );
              break;
          }
          totalProcessed += count;
        } catch (error) {
          console.log('[ScrapeProcessor] failed to scrape Facebook type', {
            type,
            error: (error as Error).message,
          });
          // Continue with other types
        }
      }

      return totalProcessed;
    } finally {
      await context.close();
      console.log('[ScrapeProcessor] browser context closed');
    }
  }

  private async scrapeFacebookVideos(
    page: Page,
    baseUrl: string,
    channelHandle: string,
  ): Promise<number> {
    console.log('[ScrapeProcessor] scraping Facebook videos');

    // Navigate to videos section
    const videosUrl = baseUrl.includes('profile.php')
      ? `${baseUrl}&sk=videos`
      : `${baseUrl}/videos`;

    await this.playwrightService.navigateWithRetry(page, videosUrl);
    await page.waitForTimeout(2000);

    // Scroll to load more content
    await this.playwrightService.scrollToLoadContent(page, {
      scrolls: 5,
      delayMs: 1500,
    });

    // Extract video links from page
    const videoData = await page.evaluate(() => {
      const videos: Array<{
        id: string;
        title: string;
        url: string;
        thumbnail?: string;
      }> = [];

      // Try multiple selectors for videos
      const videoElements = document.querySelectorAll(
        'a[href*="/videos/"], a[href*="/watch/"], [data-pagelet*="ProfileTimeline"] a[aria-label]',
      );

      videoElements.forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.href;

        // Extract video ID from URL
        const videoIdMatch =
          href.match(/\/videos\/(\d+)/) || href.match(/\/watch\/\?v=(\d+)/);
        if (!videoIdMatch) return;

        const videoId = videoIdMatch[1];
        if (videos.some((v) => v.id === videoId)) return; // Dedupe

        // Get title from aria-label or text
        const title =
          link.getAttribute('aria-label') ||
          link.textContent?.trim() ||
          'Untitled Video';

        // Try to find thumbnail
        const img = link.querySelector('img');
        const thumbnail = img?.src || img?.getAttribute('data-src') || undefined;

        videos.push({
          id: videoId,
          title,
          url: href,
          thumbnail,
        });
      });

      return videos.slice(0, 50); // Limit to 50
    });

    console.log('[ScrapeProcessor] extracted Facebook videos', {
      count: videoData.length,
    });

    // Process each video
    let processedCount = 0;
    for (const video of videoData) {
      try {
        await this.processFacebookVideo(video, channelHandle);
        processedCount++;
      } catch (error) {
        console.log('[ScrapeProcessor] failed to process Facebook video', {
          videoId: video.id,
          error: (error as Error).message,
        });
      }
    }

    return processedCount;
  }

  private async processFacebookVideo(
    video: { id: string; title: string; url: string; thumbnail?: string },
    channelHandle: string,
  ): Promise<void> {
    console.log('[ScrapeProcessor] processing Facebook video', {
      videoId: video.id,
      title: video.title.substring(0, 50),
    });

    const thumbnailUrl = await this.uploadThumbnail(
      video.thumbnail,
      `thumbnails/facebook/${channelHandle}`,
      'facebook_video',
      video.id,
    );

    // Upsert video to database
    await this.prisma.video.upsert({
      where: {
        remoteId_source: {
          remoteId: video.id,
          source: Source.FACEBOOK,
        },
      },
      create: {
        remoteId: video.id,
        source: Source.FACEBOOK,
        title: video.title,
        remoteUrl: video.url,
        thumbnailUrl,
        channelHandle,
        rawMeta: video as any,
      },
      update: {
        title: video.title,
        remoteUrl: video.url,
        thumbnailUrl: thumbnailUrl || undefined,
        rawMeta: video as any,
        updatedAt: new Date(),
      },
    });

    console.log('[ScrapeProcessor] Facebook video upserted', {
      remoteId: video.id,
    });
  }

  private async scrapeFacebookPhotos(
    page: Page,
    baseUrl: string,
    channelHandle: string,
  ): Promise<number> {
    console.log('[ScrapeProcessor] scraping Facebook photos');

    const photosUrl = baseUrl.includes('profile.php')
      ? `${baseUrl}&sk=photos`
      : `${baseUrl}/photos`;

    await this.playwrightService.navigateWithRetry(page, photosUrl);
    await page.waitForTimeout(2000);

    await this.playwrightService.scrollToLoadContent(page, {
      scrolls: 5,
      delayMs: 1500,
    });

    const photoData = await page.evaluate(() => {
      const photos: Array<{
        id: string;
        url: string;
        thumbnail?: string;
      }> = [];

      const photoLinks = document.querySelectorAll('a[href*="/photo"]');

      photoLinks.forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.href;

        const photoIdMatch = href.match(/fbid=(\d+)/);
        if (!photoIdMatch) return;

        const photoId = photoIdMatch[1];
        if (photos.some((p) => p.id === photoId)) return;

        const img = link.querySelector('img');
        const thumbnail = img?.src || img?.getAttribute('data-src') || undefined;

        photos.push({
          id: photoId,
          url: href,
          thumbnail,
        });
      });

      return photos.slice(0, 50);
    });

    console.log('[ScrapeProcessor] extracted Facebook photos', {
      count: photoData.length,
    });

    let processedCount = 0;
    for (const photo of photoData) {
      try {
        await this.processFacebookPhoto(photo, channelHandle);
        processedCount++;
      } catch (error) {
        console.log('[ScrapeProcessor] failed to process Facebook photo', {
          photoId: photo.id,
          error: (error as Error).message,
        });
      }
    }

    return processedCount;
  }

  private async processFacebookPhoto(
    photo: { id: string; url: string; thumbnail?: string },
    channelHandle: string,
  ): Promise<void> {
    const thumbnailUrl = await this.uploadThumbnail(
      photo.thumbnail,
      `thumbnails/facebook/${channelHandle}`,
      'facebook_photo',
      photo.id,
    );

    await this.prisma.photo.upsert({
      where: {
        remoteId_source: {
          remoteId: photo.id,
          source: Source.FACEBOOK,
        },
      },
      create: {
        remoteId: photo.id,
        source: Source.FACEBOOK,
        remoteUrl: photo.url,
        thumbnailUrl,
        channelHandle,
        rawMeta: photo as any,
      },
      update: {
        remoteUrl: photo.url,
        thumbnailUrl: thumbnailUrl || undefined,
        rawMeta: photo as any,
        updatedAt: new Date(),
      },
    });

    console.log('[ScrapeProcessor] Facebook photo upserted', {
      remoteId: photo.id,
    });
  }

  private async scrapeFacebookEvents(
    page: Page,
    baseUrl: string,
    channelHandle: string,
  ): Promise<number> {
    console.log('[ScrapeProcessor] scraping Facebook events');

    const eventsUrl = baseUrl.includes('profile.php')
      ? `${baseUrl}&sk=events`
      : `${baseUrl}/events`;

    await this.playwrightService.navigateWithRetry(page, eventsUrl);
    await page.waitForTimeout(2000);

    await this.playwrightService.scrollToLoadContent(page, {
      scrolls: 3,
      delayMs: 1500,
    });

    const eventData = await page.evaluate(() => {
      const events: Array<{
        id: string;
        title: string;
        url: string;
        thumbnail?: string;
      }> = [];

      const eventLinks = document.querySelectorAll('a[href*="/events/"]');

      eventLinks.forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.href;

        const eventIdMatch = href.match(/\/events\/(\d+)/);
        if (!eventIdMatch) return;

        const eventId = eventIdMatch[1];
        if (events.some((e) => e.id === eventId)) return;

        const title =
          link.getAttribute('aria-label') ||
          link.textContent?.trim() ||
          'Untitled Event';

        const img = link.querySelector('img');
        const thumbnail = img?.src || img?.getAttribute('data-src') || undefined;

        events.push({
          id: eventId,
          title,
          url: href,
          thumbnail,
        });
      });

      return events.slice(0, 50);
    });

    console.log('[ScrapeProcessor] extracted Facebook events', {
      count: eventData.length,
    });

    let processedCount = 0;
    for (const event of eventData) {
      try {
        await this.processFacebookEvent(event, channelHandle);
        processedCount++;
      } catch (error) {
        console.log('[ScrapeProcessor] failed to process Facebook event', {
          eventId: event.id,
          error: (error as Error).message,
        });
      }
    }

    return processedCount;
  }

  private async processFacebookEvent(
    event: { id: string; title: string; url: string; thumbnail?: string },
    channelHandle: string,
  ): Promise<void> {
    const thumbnailUrl = await this.uploadThumbnail(
      event.thumbnail,
      `thumbnails/facebook/${channelHandle}`,
      'facebook_event',
      event.id,
    );

    await this.prisma.event.upsert({
      where: {
        remoteId_source: {
          remoteId: event.id,
          source: Source.FACEBOOK,
        },
      },
      create: {
        remoteId: event.id,
        source: Source.FACEBOOK,
        title: event.title,
        remoteUrl: event.url,
        thumbnailUrl,
        channelHandle,
        rawMeta: event as any,
      },
      update: {
        title: event.title,
        remoteUrl: event.url,
        thumbnailUrl: thumbnailUrl || undefined,
        rawMeta: event as any,
        updatedAt: new Date(),
      },
    });

    console.log('[ScrapeProcessor] Facebook event upserted', {
      remoteId: event.id,
    });
  }

  private async scrapeFacebookContacts(
    page: Page,
    baseUrl: string,
    channelHandle: string,
  ): Promise<number> {
    console.log('[ScrapeProcessor] scraping Facebook contacts');

    const aboutUrl = baseUrl.includes('profile.php')
      ? `${baseUrl}&sk=about`
      : `${baseUrl}/about`;

    await this.playwrightService.navigateWithRetry(page, aboutUrl);
    await page.waitForTimeout(2000);

    const contactData = await page.evaluate(() => {
      const contact: {
        pageName?: string;
        phone?: string;
        email?: string;
        website?: string;
        address?: string;
      } = {};

      // Extract page name from header
      const pageNameEl = document.querySelector('h1');
      if (pageNameEl) {
        contact.pageName = pageNameEl.textContent?.trim();
      }

      // Try to find contact info
      const textNodes = Array.from(document.body.querySelectorAll('*')).map(
        (el) => el.textContent?.trim() || '',
      );

      // Look for phone
      const phoneRegex = /\+?\d[\d\s\-().]{7,}\d/g;
      for (const text of textNodes) {
        const match = text.match(phoneRegex);
        if (match) {
          contact.phone = match[0];
          break;
        }
      }

      // Look for email
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
      for (const text of textNodes) {
        const match = text.match(emailRegex);
        if (match) {
          contact.email = match[0];
          break;
        }
      }

      // Look for website
      const links = document.querySelectorAll('a[href^="http"]');
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (!href.includes('facebook.com') && !href.includes('instagram.com')) {
          contact.website = href;
          break;
        }
      }

      return contact;
    });

    console.log('[ScrapeProcessor] extracted Facebook contact info', {
      hasData: Object.keys(contactData).length > 0,
    });

    // Upsert contact
    await this.prisma.contact.upsert({
      where: {
        channelHandle_source: {
          channelHandle,
          source: Source.FACEBOOK,
        },
      },
      create: {
        source: Source.FACEBOOK,
        channelHandle,
        pageName: contactData.pageName,
        phone: contactData.phone,
        email: contactData.email,
        website: contactData.website,
        address: contactData.address,
        rawMeta: contactData as any,
      },
      update: {
        pageName: contactData.pageName || undefined,
        phone: contactData.phone || undefined,
        email: contactData.email || undefined,
        website: contactData.website || undefined,
        address: contactData.address || undefined,
        rawMeta: contactData as any,
        updatedAt: new Date(),
      },
    });

    console.log('[ScrapeProcessor] Facebook contact upserted');
    return 1;
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
