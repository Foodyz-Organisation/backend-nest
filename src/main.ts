import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ===== CORS Configuration =====
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // ===== Swagger Configuration =====
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Library API')
    .setDescription('API for managing users, books, and borrow system')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',  // ⚠️ NOM DU SCHÉMA
    )
    .build();

  const document = SwaggerModule.createDocument(app as any, swaggerConfig);
  SwaggerModule.setup('api', app as any, document, {
    swaggerOptions: {
      persistAuthorization: true,  // ✅ Garde le token même après rafraîchissement
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📘 Swagger UI: http://localhost:${port}/api`);
}

bootstrap();