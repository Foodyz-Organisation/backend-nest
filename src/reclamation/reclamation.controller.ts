import { Controller, Post, Body, UseGuards, Get, Param, Put } from '@nestjs/common';
import { ReclamationService } from './reclamation.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RespondReclamationDto } from './dto/respond-reclamation.dto';

@ApiTags('Reclamation')
@Controller('reclamation')
export class ReclamationController {
  constructor(private readonly reclamationService: ReclamationService) {}

  // ✅ CRÉER une réclamation (CLIENT)
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Créer une réclamation (client)' })
  @ApiResponse({ status: 201, description: 'Réclamation créée avec succès' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  create(
    @Body() createReclamationDto: CreateReclamationDto,
    @CurrentUser() user: any,
  ) {
    console.log('🔐 User from token:', user);
    console.log('📝 DTO received:', createReclamationDto);

    const restaurantEmail = 'ouaghlani.manel@esprit.tn'.trim().toLowerCase();
    
    const finalData = {
      ...createReclamationDto,
      nomClient: user.nomPrenom || user.username || 'Utilisateur',
      emailClient: user.email,
      userId: user.userId,
      restaurantEmail: restaurantEmail,
      restaurantId: '69245d58871665d54c49a07a'
    };

    console.log('💾 Final data to save:', finalData);
    console.log('📧 Restaurant email (normalized):', finalData.restaurantEmail);
    
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

  // ✅ RÉCUPÉRER les réclamations pour MON RESTAURANT (utilise le token)
  @Get('restaurant/my-reclamations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Réclamations de mon restaurant (professional)' })
  @ApiResponse({ status: 200, description: 'Liste des réclamations du restaurant' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  getMyRestaurantReclamations(@CurrentUser() user: any) {
    console.log('📩 Restaurant connecté:', user);
    console.log('📧 Restaurant email:', user.email);
    console.log('🆔 Restaurant userId:', user.userId);
    
    const restaurantEmail = user.email.trim().toLowerCase();
    console.log('🔍 Recherche avec email normalisé:', restaurantEmail);
    
    return this.reclamationService.findByRestaurantEmail(restaurantEmail);
  }

  // ✅ NOUVEAU: Récupérer les réclamations par restaurantId (pour Android)
  @Get('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Réclamations par ID restaurant' })
  @ApiResponse({ status: 200, description: 'Liste des réclamations du restaurant' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async getReclamationsByRestaurantId(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any
  ) {
    console.log('🎯 GET /reclamation/restaurant/:restaurantId appelé');
    console.log('🆔 Restaurant ID reçu:', restaurantId);
    console.log('👤 User connecté:', user);

    // Option 1: Chercher par restaurantId
    console.log('🔍 Recherche par restaurantId...');
    let reclamations = await this.reclamationService.findByRestaurantId(restaurantId);
    
    if (reclamations.length === 0) {
      console.log('⚠️ Aucune réclamation trouvée avec restaurantId');
      console.log('🔄 Tentative avec email du user connecté...');
      
      // Option 2: Si pas de résultat, chercher par email du user connecté
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
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Réclamation non trouvée' })
  respond(
    @Param('id') id: string,
    @Body() dto: RespondReclamationDto,
    @CurrentUser() user: any
  ) {
    const responder = user.email || user.userId || 'restaurant';
    console.log('📝 Réponse par:', responder);
    return this.reclamationService.respondToReclamation(id, dto, responder);
  }

  // ⚠️ IMPORTANT : Cette route DOIT être EN DERNIER
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une réclamation par ID' })
  @ApiResponse({ status: 200, description: 'Détails de la réclamation' })
  @ApiResponse({ status: 404, description: 'Réclamation non trouvée' })
  findOne(@Param('id') id: string) {
    console.log('🔍 Finding reclamation by id:', id);
    return this.reclamationService.findOne(id);
  }
}