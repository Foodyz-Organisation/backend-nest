import { Controller, Post, Body, UseGuards, Get, Param, Put, Logger } from '@nestjs/common';
import { ReclamationService } from './reclamation.service';
import { LoyaltyService, PointsBalance, Reward } from 'src/reclamation/LoyaltyService';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RespondReclamationDto } from './dto/respond-reclamation.dto';
import { OrderService } from '../order/order.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProfessionalAccount } from '../professionalaccount/schema/professionalaccount.schema';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';

@ApiTags('Reclamation')
@Controller('reclamation')
export class ReclamationController {
  private readonly logger = new Logger(ReclamationController.name);

  constructor(
    private readonly reclamationService: ReclamationService,
    private readonly loyaltyService: LoyaltyService,
    private readonly orderService: OrderService,
    @InjectModel(ProfessionalAccount.name) private professionalModel: Model<ProfessionalAccount>,
    private supabaseStorageService: SupabaseStorageService,
  ) { }

  // Note: Images are now served directly from Supabase Storage URLs
  // The getImage endpoint has been removed as images are publicly accessible via Supabase

  // ✅ CRÉER une réclamation (CLIENT) - AVEC UPLOAD BASE64 ET ASSOCIATION RESTAURANT
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
    this.logger.log('🔐 User from token:', user);
    this.logger.log('📝 DTO received:', createReclamationDto);
    this.logger.log('📸 Photos reçues:', createReclamationDto.photos?.length || 0);

    const photoPaths: string[] = [];

    if (createReclamationDto.photos && createReclamationDto.photos.length > 0) {
      try {
        this.logger.log(`📷 Uploading ${createReclamationDto.photos.length} image(s) to Supabase Storage...`);
        const uploadedUrls = await this.supabaseStorageService.uploadBase64Images(
          createReclamationDto.photos,
          'reclamations',
        );
        photoPaths.push(...uploadedUrls);
        this.logger.log(`✅ ${uploadedUrls.length} image(s) uploaded successfully`);
      } catch (error) {
        this.logger.error(`❌ Erreur upload images:`, error);
        throw error;
      }
    }

    // ✅ NOUVEAU: Récupérer le restaurant depuis la commande
    let restaurantEmail = 'unknown@restaurant.com';
    let restaurantId: string | undefined = undefined;

    try {
      this.logger.log(`🔍 Recherche de la commande: ${createReclamationDto.commandeConcernee}`);

      const order = await this.orderService.getOrderById(createReclamationDto.commandeConcernee);

      if (order && order.professionalId) {
        this.logger.log(`✅ Commande trouvée, professionalId: ${order.professionalId}`);

        // Récupérer les infos du professionnel
        const professional = await this.professionalModel.findById(order.professionalId).lean();

        if (professional) {
          restaurantEmail = professional.email?.trim().toLowerCase() || restaurantEmail;
          restaurantId = professional._id.toString();
          this.logger.log(`✅ Restaurant trouvé: ${restaurantEmail} (ID: ${restaurantId})`);
        } else {
          this.logger.warn(`⚠️ Professionnel non trouvé pour ID: ${order.professionalId}`);
        }
      } else {
        this.logger.warn(`⚠️ Commande non trouvée ou sans professionalId`);
      }
    } catch (error) {
      this.logger.error(`❌ Erreur récupération restaurant:`, error);
    }

    const finalData = {
      description: createReclamationDto.description,
      commandeConcernee: createReclamationDto.commandeConcernee,
      complaintType: createReclamationDto.complaintType,
      photos: photoPaths,
      nomClient: user.nomPrenom || user.username || 'Utilisateur',
      emailClient: user.email,
      userId: user.userId,
      restaurantEmail: restaurantEmail,
      restaurantId: restaurantId
    };

    this.logger.log('💾 Final data to save:', finalData);
    this.logger.log('📷 Photos sauvegardées:', photoPaths);

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