import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ===== Enable CORS =====
  app.enableCors();

  // ===== Global Validation =====
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,         // <--- THIS FIXES YOUR PRICE ERROR
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ===== Serve Uploaded Images =====
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ===== Swagger Configuration =====
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Food App API')
    .setDescription('API for managing restaurants, menu items, and orders')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app as any, swaggerConfig);
  SwaggerModule.setup('api', app as any, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ===== Start Server =====
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📘 Swagger UI: http://localhost:${port}/api`);
}

bootstrap();
