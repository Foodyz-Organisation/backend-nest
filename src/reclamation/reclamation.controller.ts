import { Controller, Post, Body, UseGuards, Get, Param, Put, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ReclamationService } from './reclamation.service';
import { LoyaltyService, PointsBalance, Reward } from 'src/reclamation/LoyaltyService';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RespondReclamationDto } from './dto/respond-reclamation.dto';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';

@ApiTags('Reclamation')
@Controller('reclamation')
export class ReclamationController {
  constructor(
    private readonly reclamationService: ReclamationService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  // ✅ NOUVELLE ROUTE: Servir les images manuellement
  @Get('image/:filename')
  @ApiOperation({ summary: 'Récupérer une image de réclamation' })
  async getImage(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const imagePath = path.join(process.cwd(), 'uploads', 'reclamations', filename);
    
    console.log('📷 Requête image:', filename);
    console.log('📁 Chemin complet:', imagePath);
    console.log('✅ Fichier existe:', fs.existsSync(imagePath));
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Fichier introuvable:', imagePath);
      throw new Error('Image not found');
    }
    
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    
    console.log('📄 Content-Type:', contentType);
    
    res.set({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000',
    });
    
    const file = createReadStream(imagePath);
    console.log('✅ Image servie avec succès');
    
    return new StreamableFile(file);
  }

  // ✅ CRÉER une réclamation (CLIENT) - AVEC UPLOAD BASE64
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Créer une réclamation (client)' })
  @ApiResponse({ status: 201, description: 'Réclamation créée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async create(
    @Body() createReclamationDto: CreateReclamationDto,
    @CurrentUser() user: any,
  ) {
    console.log('🔐 User from token:', user);
    console.log('📝 DTO received:', createReclamationDto);
    console.log('📸 Photos reçues:', createReclamationDto.photos?.length || 0);

    const photoPaths: string[] = [];
    
    if (createReclamationDto.photos && createReclamationDto.photos.length > 0) {
      const uploadDir = './uploads/reclamations';
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < createReclamationDto.photos.length; i++) {
        let base64Data = createReclamationDto.photos[i];
        
        try {
          console.log(`📷 Image ${i + 1} - Longueur:`, base64Data.length);
          
          let ext = 'jpeg';
          let data = base64Data;
          
          const matchesComplete = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matchesComplete) {
            ext = matchesComplete[1];
            data = matchesComplete[2];
          } else if (!base64Data.startsWith('data:')) {
            data = base64Data.replace(/\s/g, '');
            const buffer = Buffer.from(data, 'base64');
            if (buffer[0] === 0xFF && buffer[1] === 0xD8) ext = 'jpeg';
            else if (buffer[0] === 0x89 && buffer[1] === 0x50) ext = 'png';
          } else {
            const matchesSimple = base64Data.match(/^data:image\/(\w+);base64,/);
            if (matchesSimple) {
              ext = matchesSimple[1];
              data = base64Data.split(',')[1];
            }
          }
          
          const filename = `${Date.now()}-${i}-${Math.round(Math.random() * 1e9)}.${ext}`;
          const filepath = path.join(uploadDir, filename);
          
          fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
          
          photoPaths.push(`/reclamation/image/${filename}`);
          console.log(`✅ Image ${i + 1} sauvegardée: ${filename}`);
          console.log(`📍 URL: /reclamation/image/${filename}`);
        } catch (error) {
          console.error(`❌ Erreur sauvegarde image ${i + 1}:`, error);
        }
      }
    }

    const restaurantEmail = 'menyar.benghorbel@esprit.tn'.trim().toLowerCase();
    
    const finalData = {
      description: createReclamationDto.description,
      commandeConcernee: createReclamationDto.commandeConcernee,
      complaintType: createReclamationDto.complaintType,
      photos: photoPaths,
      nomClient: user.nomPrenom || user.username || 'Utilisateur',
      emailClient: user.email,
      userId: user.userId,
      restaurantEmail: restaurantEmail,
      restaurantId: '69245cbc871665d54c49a075'
    };

    console.log('💾 Final data to save:', finalData);
    console.log('📷 Photos sauvegardées:', photoPaths);
    
    return this.reclamationService.create(finalData);
  }

  // ✅ RÉCUPÉRER mes réclamations (CLIENT connecté)
  @Get('my-reclamations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mes réclamations (client)' })
  @ApiResponse({ status: 200, description: 'Liste des réclamations du client' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  getMyReclamations(@CurrentUser() user: any) {
    const userId = user.userId;
    console.log('📋 Fetching reclamations for userId:', userId);
    return this.reclamationService.findByUserId(userId);
  }

  // ✅ RÉCUPÉRER les réclamations pour MON RESTAURANT
  @Get('restaurant/my-reclamations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Réclamations de mon restaurant (professional)' })
  @ApiResponse({ status: 200, description: 'Liste des réclamations du restaurant' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  getMyRestaurantReclamations(@CurrentUser() user: any) {
    console.log('📩 Restaurant connecté:', user);
    console.log('📧 Restaurant email:', user.email);
    
    const restaurantEmail = user.email.trim().toLowerCase();
    console.log('🔍 Recherche avec email normalisé:', restaurantEmail);
    
    return this.reclamationService.findByRestaurantEmail(restaurantEmail);
  }

  // ✅ Récupérer les réclamations par restaurantId
  @Get('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Réclamations par ID restaurant' })
  @ApiResponse({ status: 200, description: 'Liste des réclamations du restaurant' })
  async getReclamationsByRestaurantId(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any
  ) {
    console.log('🎯 GET /reclamation/restaurant/:restaurantId appelé');
    console.log('🆔 Restaurant ID reçu:', restaurantId);

    let reclamations = await this.reclamationService.findByRestaurantId(restaurantId);
    
    if (reclamations.length === 0) {
      console.log('⚠️ Aucune réclamation trouvée avec restaurantId');
      const restaurantEmail = user.email.trim().toLowerCase();
      reclamations = await this.reclamationService.findByRestaurantEmail(restaurantEmail);
    }

    console.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    return reclamations;
  }

  // ✅ TOUTES les réclamations (ADMIN)
  @Get('all')
  @ApiOperation({ summary: 'Toutes les réclamations (admin)' })
  @ApiResponse({ status: 200, description: 'Liste de toutes les réclamations' })
  findAll() {
    return this.reclamationService.findAll();
  }

  // ✅ RÉPONDRE à une réclamation (RESTAURANT)
  @Put(':id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Répondre à une réclamation (restaurant)' })
  @ApiResponse({ status: 200, description: 'Réponse ajoutée avec succès' })
  respond(
    @Param('id') id: string,
    @Body() dto: RespondReclamationDto,
    @CurrentUser() user: any
  ) {
    const responder = user.email || user.userId || 'restaurant';
    console.log('📝 Réponse par:', responder);
    return this.reclamationService.respondToReclamation(id, dto, responder);
  }

  // 💰 NOUVEAUTÉ: Points de fidélité de l'utilisateur
  @Get('user/loyalty')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mes points de fidélité' })
  @ApiResponse({ status: 200, description: 'Solde des points' })
  async getUserLoyalty(@CurrentUser() user: any): Promise<PointsBalance | null> {
    return this.loyaltyService.getPointsBalance(user.userId);
  }

  // 🎁 NOUVEAUTÉ: Récompenses disponibles
  @Get('user/rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Récompenses disponibles' })
  @ApiResponse({ status: 200, description: 'Liste des récompenses' })
  async getAvailableRewards(@CurrentUser() user: any): Promise<Reward[]> {
    return this.loyaltyService.checkAvailableRewards(user.userId);
  }

  // ⚠️ IMPORTANT : Cette route DOIT être EN DERNIER
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une réclamation par ID' })
  @ApiResponse({ status: 200, description: 'Détails de la réclamation' })
  findOne(@Param('id') id: string) {
    console.log('🔍 Finding reclamation by id:', id);
    return this.reclamationService.findOne(id);
  }
}