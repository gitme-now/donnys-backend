import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { DatabaseModule } from './database/prisma.module';
import { VideosModule } from './videos/videos.module';
import { PhotosModule } from './photos/photos.module';
import { EventsModule } from './events/events.module';
import { ContactsModule } from './contacts/contacts.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        },
      }),
    }),
    DatabaseModule,
    VideosModule,
    PhotosModule,
    EventsModule,
    ContactsModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
