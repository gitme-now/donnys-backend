import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  console.log('[bootstrap] starting application');

  // yt-dlp availability is checked and auto-downloaded by YtDlpService on module init.
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS
  app.enableCors();

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Donny's Backend API")
    .setDescription(
      'API for managing scraped content from YouTube and Facebook channels',
    )
    .setVersion('1.0')
    .addTag('Videos', 'Video content endpoints')
    .addTag('Photos', 'Photo content endpoints')
    .addTag('Events', 'Event endpoints')
    .addTag('Contacts', 'Contact information endpoints')
    .addTag('Admin', 'Administrative endpoints (scrape management)')
    .addTag('Health', 'Health check endpoint')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
