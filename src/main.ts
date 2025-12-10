import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // ===== CORS Configuration (Optimized for Mobile Apps) =====
  app.enableCors({
    origin: '*', // Allows all origins (for development)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, x-user-id, x-owner-type',
  });

  // ===== Vérification des dossiers =====
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  console.log('📁 Chemin uploads absolu:', uploadsPath);

  if (!fs.existsSync(uploadsPath)) {
    console.warn('⚠️ Le dossier uploads n\'existe pas ! Création...');
    fs.mkdirSync(uploadsPath, { recursive: true });
  } else {
    console.log('✅ Dossier uploads existe');
  }

  const reclamationsPath = path.join(uploadsPath, 'reclamations');
  if (fs.existsSync(reclamationsPath)) {
    const files = fs.readdirSync(reclamationsPath);
    console.log(`📸 ${files.length} fichier(s) dans uploads/reclamations`);
  } else {
    console.warn('⚠️ Le dossier uploads/reclamations n\'existe pas !');
    fs.mkdirSync(reclamationsPath, { recursive: true });
  }

  // ===== Global Validation =====
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ===== Serve Uploaded Images =====
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

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
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;

  // Obtenir l'IP locale pour affichage
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';

  Object.keys(networkInterfaces).forEach(interfaceName => {
    const ifaces = networkInterfaces[interfaceName];
    if (ifaces) {
      ifaces.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
        }
      });
    }
  });

  console.log('='.repeat(60));
  console.log(`🚀 Application is running on:`);
  console.log(`   - http://localhost:${port}`);
  console.log(`   ⭐ http://${localIP}:${port} (USE THIS IP FOR REAL DEVICE)`);
  console.log(`   📱 Emulator: http://10.0.2.2:${port}`);
  console.log(`📘 Swagger: http://${localIP}:${port}/api`);
  console.log('');
  console.log(`📸 Test images:`);
  console.log(`   http://${localIP}:${port}/uploads-test`);
  console.log(`   http://${localIP}:${port}/uploads/reclamations/1764421570644-0-110156091.png`);
  console.log('='.repeat(60));

  // ===== Start Server on ALL interfaces (0.0.0.0) =====
  // This allows connections from emulator (10.0.2.2) AND real devices (your IP)
  await app.listen(port, '0.0.0.0');
  
  console.log(`✅ Server listening on 0.0.0.0:${port} (accepts connections from all network interfaces)`);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📘 Swagger UI: http://localhost:${port}/api`);
}

bootstrap();