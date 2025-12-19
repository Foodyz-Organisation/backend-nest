import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reclamation } from './schemas/reclamation.schema';
import { ReclamationDocument } from './schemas/reclamation.schema';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { RespondReclamationDto } from './dto/respond-reclamation.dto';
import { AiValidationService } from './ai-validation.service';
import { LoyaltyService } from 'src/reclamation/LoyaltyService';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/schema/notification.schema';
import { OrderService } from '../order/order.service';

@Injectable()
export class ReclamationService {
  private readonly logger = new Logger(ReclamationService.name);

  constructor(
    @InjectModel(Reclamation.name) private reclamationModel: Model<ReclamationDocument>,
    private aiValidationService: AiValidationService,
    private loyaltyService: LoyaltyService,
    private notificationService: NotificationService,
    private orderService: OrderService,
  ) {}

  async create(createReclamationDto: CreateReclamationDto): Promise<ReclamationDocument> {
    try {
      this.logger.log('💾 Création réclamation avec analyse IA...');

      const normalizedData = {
        ...createReclamationDto,
        restaurantEmail: createReclamationDto.restaurantEmail?.trim().toLowerCase(),
      };

      // 1️⃣ Créer la réclamation
      const createdReclamation = new this.reclamationModel(normalizedData);
      const saved = await createdReclamation.save();

      this.logger.log(`✅ Réclamation créée: ${saved._id}`);

      // Create notification for the restaurant/professional about new reclamation
      try {
        if (saved.restaurantId) {
          await this.notificationService.createReclamationNotification(
            NotificationType.RECLAMATION_CREATED,
            (saved._id as Types.ObjectId).toString(),
            undefined, // userId
            saved.restaurantId, // professionalId
            saved.statut,
            {
              reclamationId: (saved._id as Types.ObjectId).toString(),
              nomClient: saved.nomClient,
              complaintType: saved.complaintType,
              commandeConcernee: saved.commandeConcernee,
            },
          );
        }
      } catch (notifError) {
        this.logger.error('Error creating reclamation notification:', notifError);
        // Don't fail the reclamation creation if notification fails
      }

      // 2️⃣ Analyser avec IA (en arrière-plan)
      const reclamationId = (saved._id as Types.ObjectId).toString();
      this.processReclamationWithAI(reclamationId).catch(err => {
        this.logger.error('❌ Erreur traitement IA:', err);
      });

      return saved;

    } catch (error) {
      this.logger.error('❌ Erreur création:', error);
      throw error;
    }
  }

  /**
   * 🤖 Traite une réclamation avec IA
   */
  private async processReclamationWithAI(reclamationId: string): Promise<void> {
    try {
      const reclamation = await this.reclamationModel.findById(reclamationId);
      if (!reclamation) return;

      this.logger.log(`🤖 Analyse IA pour réclamation ${reclamationId}...`);

      // Analyser avec IA
      const aiResult = await this.aiValidationService.validateReclamation(
        reclamation.description,
        reclamation.complaintType,
        reclamation.photos || []
      );

      // Mettre à jour la réclamation
      reclamation.aiProcessed = true;
      reclamation.aiValidation = aiResult as any;

      // Attribuer des points
      const loyaltyResult = await this.loyaltyService.awardPoints(
        reclamation.userId,
        reclamationId,
        aiResult.isValid,
        aiResult.confidenceScore
      );

      if (loyaltyResult) {
        reclamation.pointsAwarded = loyaltyResult.pointsAwarded;
      }

      // Si invalide avec haute confiance, rejeter automatiquement
      if (!aiResult.isValid && aiResult.confidenceScore >= 80) {
        reclamation.statut = 'rejetee';
        reclamation.responseMessage = aiResult.recommendation;
        reclamation.respondedBy = 'AI System';
        reclamation.respondedAt = new Date();
      }

      await reclamation.save();

      this.logger.log(
        `✅ Analyse IA terminée: ${aiResult.isValid ? 'VALIDE' : 'INVALIDE'} (${aiResult.confidenceScore}%)`
      );

    } catch (error) {
      this.logger.error('❌ Erreur traitement IA:', error);
      
      // Enregistrer l'erreur
      await this.reclamationModel.findByIdAndUpdate(reclamationId, {
        aiProcessed: true,
        aiProcessingError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Helper method pour enrichir une réclamation avec les noms des items de la commande
   */
  private async enrichReclamationWithItemNames(reclamation: any): Promise<any> {
    const enriched = { ...reclamation };
    
    // Initialiser avec des valeurs par défaut
    enriched.itemNames = [];
    enriched.name = reclamation.complaintType || 'Unknown';
    
    // Vérifier si commandeConcernee existe et est valide
    if (!reclamation.commandeConcernee) {
      return enriched;
    }
    
    // Vérifier si c'est un ObjectId valide (24 caractères hexadécimaux)
    const commandeConcernee = reclamation.commandeConcernee.toString().trim();
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(commandeConcernee);
    
    if (!isValidObjectId) {
      // Si ce n'est pas un ObjectId valide (ex: "Commande #12346"), on garde les valeurs par défaut
      return enriched;
    }
    
    try {
      const order = await this.orderService.getOrderById(commandeConcernee);
      if (order && order.items && Array.isArray(order.items) && order.items.length > 0) {
        // Extraire les noms des items (le champ 'name' est required dans OrderItem schema)
        const itemNames = order.items
          .map((item: any) => {
            // Récupérer le nom de l'item (champ 'name' qui est required)
            return item?.name || null;
          })
          .filter((name: string | null) => name && name.trim().length > 0);
        
        enriched.itemNames = itemNames;
        
        // Pour la compatibilité avec le frontend, utiliser le premier nom d'item comme nom principal
        // Si plusieurs items, on peut les joindre ou prendre le premier
        if (itemNames.length > 0) {
          enriched.name = itemNames[0]; // Premier item
          // Optionnel: si plusieurs items, on pourrait joindre: itemNames.join(', ')
        } else {
          enriched.name = reclamation.complaintType || 'Unknown';
        }
        
        this.logger.log(`✅ Réclamation enrichie avec ${itemNames.length} item(s): ${itemNames.join(', ')}`);
      } else {
        this.logger.warn(`⚠️ Commande ${commandeConcernee} trouvée mais sans items`);
      }
    } catch (error: any) {
      // Ne logger que les erreurs inattendues (pas les NotFoundException qui sont normales)
      if (error.status !== 404) {
        this.logger.warn(`Erreur lors de la récupération de la commande ${commandeConcernee}: ${error.message}`);
      }
      // En cas d'erreur, on garde les valeurs par défaut déjà définies
    }
    
    return enriched;
  }

  async findAll(): Promise<any[]> {
    const reclamations = await this.reclamationModel.find().sort({ createdAt: -1 }).lean().exec();
    
    // Enrichir avec les noms des items de la commande
    const enrichedReclamations = await Promise.all(
      reclamations.map(reclamation => this.enrichReclamationWithItemNames(reclamation))
    );
    
    return enrichedReclamations;
  }

  async findByUserId(userId: string): Promise<any[]> {
    this.logger.log(`🔍 Réclamations pour user ${userId}`);
    const reclamations = await this.reclamationModel
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    this.logger.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    
    // Enrichir avec les noms des items de la commande
    const enrichedReclamations = await Promise.all(
      reclamations.map(reclamation => this.enrichReclamationWithItemNames(reclamation))
    );
    
    return enrichedReclamations;
  }

  async findByRestaurantId(restaurantId: string): Promise<any[]> {
    this.logger.log(`🔍 Réclamations pour restaurant ${restaurantId}`);
    const reclamations = await this.reclamationModel
      .find({ restaurantId: restaurantId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    this.logger.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    
    // Enrichir avec les noms des items de la commande
    const enrichedReclamations = await Promise.all(
      reclamations.map(reclamation => this.enrichReclamationWithItemNames(reclamation))
    );
    
    return enrichedReclamations;
  }

  async findByRestaurantEmail(restaurantEmail: string): Promise<any[]> {
    this.logger.log(`🔍 Réclamations pour email ${restaurantEmail}`);
    const normalizedEmail = restaurantEmail?.trim().toLowerCase();
    
    let reclamations = await this.reclamationModel
      .find({ restaurantEmail: normalizedEmail })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (reclamations.length === 0) {
      reclamations = await this.reclamationModel
        .find({ 
          restaurantEmail: { 
            $regex: normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
            $options: 'i' 
          } 
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }

    this.logger.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    
    // Enrichir avec les noms des items de la commande
    const enrichedReclamations = await Promise.all(
      reclamations.map(reclamation => this.enrichReclamationWithItemNames(reclamation))
    );
    
    return enrichedReclamations;
  }

  async findOne(id: string): Promise<any> {
    const reclamation = await this.reclamationModel.findById(id).lean().exec();
    if (!reclamation) throw new NotFoundException('Réclamation non trouvée');
    // Enrichir avec les noms des items de la commande
    return this.enrichReclamationWithItemNames(reclamation);
  }

  async update(id: string, updateReclamationDto: UpdateReclamationDto): Promise<ReclamationDocument> {
    const updated = await this.reclamationModel
      .findByIdAndUpdate(id, updateReclamationDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Réclamation non trouvée');
    return updated;
  }

  async remove(id: string): Promise<ReclamationDocument> {
    const deleted = await this.reclamationModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Réclamation non trouvée');
    return deleted;
  }

  async respondToReclamation(
    id: string, 
    dto: RespondReclamationDto, 
    responder: string
  ): Promise<ReclamationDocument> {
    const toUpdate: any = {
      responseMessage: dto.responseMessage,
      respondedBy: responder,
      respondedAt: new Date(),
    };
    if (dto.newStatus) toUpdate.statut = dto.newStatus;

    const updated = await this.reclamationModel
      .findByIdAndUpdate(id, { $set: toUpdate }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Réclamation non trouvée');
    this.logger.log(`✅ Réponse ajoutée: ${updated._id}`);

    // Create notification for the user about reclamation response/update
    try {
      await this.notificationService.createReclamationNotification(
        dto.newStatus ? NotificationType.RECLAMATION_UPDATED : NotificationType.RECLAMATION_RESPONDED,
        (updated._id as Types.ObjectId).toString(),
        updated.userId, // userId
        undefined, // professionalId
        updated.statut,
        {
          reclamationId: (updated._id as Types.ObjectId).toString(),
          responseMessage: dto.responseMessage,
          respondedBy: responder,
        },
      );
    } catch (notifError) {
      this.logger.error('Error creating reclamation response notification:', notifError);
      // Don't fail the response if notification fails
    }

    return updated;
  }
}