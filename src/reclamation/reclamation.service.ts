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

@Injectable()
export class ReclamationService {
  private readonly logger = new Logger(ReclamationService.name);

  constructor(
    @InjectModel(Reclamation.name) private reclamationModel: Model<ReclamationDocument>,
    private aiValidationService: AiValidationService,
    private loyaltyService: LoyaltyService,
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

  async findAll(): Promise<ReclamationDocument[]> {
    return this.reclamationModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByUserId(userId: string): Promise<ReclamationDocument[]> {
    this.logger.log(`🔍 Réclamations pour user ${userId}`);
    const reclamations = await this.reclamationModel
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .exec();
    this.logger.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    return reclamations;
  }

  async findByRestaurantId(restaurantId: string): Promise<ReclamationDocument[]> {
    this.logger.log(`🔍 Réclamations pour restaurant ${restaurantId}`);
    const reclamations = await this.reclamationModel
      .find({ restaurantId: restaurantId })
      .sort({ createdAt: -1 })
      .exec();
    this.logger.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    return reclamations;
  }

  async findByRestaurantEmail(restaurantEmail: string): Promise<ReclamationDocument[]> {
    this.logger.log(`🔍 Réclamations pour email ${restaurantEmail}`);
    const normalizedEmail = restaurantEmail?.trim().toLowerCase();
    
    let reclamations = await this.reclamationModel
      .find({ restaurantEmail: normalizedEmail })
      .sort({ createdAt: -1 })
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
        .exec();
    }

    this.logger.log(`✅ ${reclamations.length} réclamation(s) trouvée(s)`);
    return reclamations;
  }

  async findOne(id: string): Promise<ReclamationDocument> {
    const reclamation = await this.reclamationModel.findById(id).exec();
    if (!reclamation) throw new NotFoundException('Réclamation non trouvée');
    return reclamation;
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
    return updated;
  }
}