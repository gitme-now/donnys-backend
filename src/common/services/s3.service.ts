import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('s3.endpoint');
    const accessKey = this.configService.get<string>('s3.accessKey');
    const secretKey = this.configService.get<string>('s3.secretKey');
    const region = this.configService.get<string>('s3.region');
    this.bucket = this.configService.get<string>('s3.bucket');

    this.s3Client = new S3Client({
      endpoint,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      region,
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Upload a buffer to S3 and return the public URL
   */
  async uploadThumbnail(
    buffer: Buffer,
    contentType: string,
    prefix = 'thumbnails',
  ): Promise<string> {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = contentType.split('/')[1] || 'jpg';
    const key = `${prefix}/${hash}.${ext}`;

    console.log('[S3Service] uploading thumbnail', {
      key,
      size: buffer.length,
      contentType,
    });

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      const endpoint = this.configService.get<string>('s3.endpoint');
      const url = `${endpoint}/${this.bucket}/${key}`;
      console.log('[S3Service] upload succeeded', { url });
      return url;
    } catch (error) {
      console.log('[S3Service] upload failed', { key, error });
      throw error;
    }
  }

  /**
   * Download a thumbnail from a URL and upload it to S3
   */
  async downloadAndUploadThumbnail(
    thumbnailUrl: string,
    prefix = 'thumbnails',
  ): Promise<string | null> {
    if (!thumbnailUrl) return null;

    console.log('[S3Service] downloading thumbnail', { thumbnailUrl });

    try {
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        console.log('[S3Service] download failed', {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return await this.uploadThumbnail(buffer, contentType, prefix);
    } catch (error) {
      console.log('[S3Service] downloadAndUploadThumbnail error', {
        thumbnailUrl,
        error: (error as Error).message,
      });
      return null;
    }
  }
}
