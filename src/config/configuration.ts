export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION || 'us-east-1',
  },
  scraping: {
    ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
    cronTimezone: process.env.CRON_TIMEZONE || 'America/Chicago',
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
  },
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
  },
});
