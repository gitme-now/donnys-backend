import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { AdminService, SCRAPE_QUEUE } from './admin.service';
import { ScrapeProcessor } from './scrape.processor';
import { S3Service } from '../common/services/s3.service';
import { YtDlpService } from '../common/services/ytdlp.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SCRAPE_QUEUE,
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, ScrapeProcessor, S3Service, YtDlpService],
  exports: [AdminService],
})
export class AdminModule {}
