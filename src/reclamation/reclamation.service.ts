import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reclamation } from './entities/reclamation.entity';
import { ReclamationDocument } from './schemas/reclamation.schema';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { UpdateReclamationDto } from './dto/update-reclamation.dto';
import { RespondReclamationDto } from './dto/respond-reclamation.dto';

@Injectable()
export class ReclamationService {
  constructor(
    @InjectModel(Reclamation.name) private reclamationModel: Model<ReclamationDocument>,
  ) {}

  async create(createReclamationDto: CreateReclamationDto) {
    try {
      console.log('💾 Création réclamation:', createReclamationDto);
      
      const normalizedData = {
        ...createReclamationDto,
        restaurantEmail: createReclamationDto.restaurantEmail?.trim().toLowerCase(),
      };
      
      console.log('📧 Email normalisé:', normalizedData.restaurantEmail);
      
      const createdReclamation = new this.reclamationModel(normalizedData);
      const saved = await createdReclamation.save();
      
      console.log('✅ Réclamation créée avec ID:', saved._id);
      console.log('📧 Email restaurant enregistré:', saved.restaurantEmail);
      
      return saved;
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error);
      throw error;
    }
  }

  async findAll() {
    return this.reclamationModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByUserId(userId: string) {
    console.log('🔍 Searching reclamations for userId:', userId);
    const reclamations = await this.reclamationModel
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .exec();
    console.log(`✅ Found ${reclamations.length} reclamation(s) for user ${userId}`);
    return reclamations;
  }

  async findByRestaurantId(restaurantId: string) {
    console.log('🔍 Searching reclamations for restaurantId:', restaurantId);
    
    try {
      // ✅ Recherche DIRECTE par restaurantId (le plus fiable)
      const reclamations = await this.reclamationModel
        .find({ restaurantId: restaurantId })
        .sort({ createdAt: -1 })
        .exec();
      
      console.log(`✅ Found ${reclamations.length} reclamation(s) for restaurantId ${restaurantId}`);
      
      if (reclamations.length > 0) {
        console.log('📋 Premières réclamations trouvées:');
        reclamations.slice(0, 3).forEach(rec => {
          console.log(`  - ID: ${rec._id}, Client: ${rec.nomClient}, Description: ${rec.description?.substring(0, 50)}`);
        });
      }
      
      return reclamations;
    } catch (error) {
      console.error('❌ Erreur findByRestaurantId:', error);
      throw error;
    }
  }

  async findByRestaurantEmail(restaurantEmail: string) {
    console.log('🔍 Searching reclamations for restaurant email:', restaurantEmail);
    
    const normalizedEmail = restaurantEmail?.trim().toLowerCase();
    console.log('📧 Email normalisé pour recherche:', normalizedEmail);
    
    try {
      // ✅ STRATÉGIE 1: Recherche avec l'email exact
      let reclamations = await this.reclamationModel
        .find({ restaurantEmail: normalizedEmail })
        .sort({ createdAt: -1 })
        .exec();
      
      console.log(`📊 Stratégie 1 (exact match): ${reclamations.length} résultats`);
      
      // ✅ STRATÉGIE 2: Si aucun résultat, essayer une regex case-insensitive
      if (reclamations.length === 0) {
        console.log('⚠️ Aucun résultat avec email exact, essai avec regex...');
        reclamations = await this.reclamationModel
          .find({ 
            restaurantEmail: { 
              $regex: normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
              $options: 'i' 
            } 
          })
          .sort({ createdAt: -1 })
          .exec();
        
        console.log(`📊 Stratégie 2 (regex): ${reclamations.length} résultats`);
      }
      
      // ✅ STRATÉGIE 3: Si toujours rien, chercher TOUTES les réclamations et filtrer manuellement
      if (reclamations.length === 0) {
        console.log('⚠️ Aucun résultat avec regex, recherche manuelle...');
        const allReclamations = await this.reclamationModel.find().exec();
        
        reclamations = allReclamations.filter(rec => {
          const recEmail = rec.restaurantEmail?.trim().toLowerCase();
          const match = recEmail === normalizedEmail;
          if (match) {
            console.log(`✅ Match trouvé: "${rec.restaurantEmail}" === "${normalizedEmail}"`);
          }
          return match;
        });
        
        console.log(`📊 Stratégie 3 (filtre manuel): ${reclamations.length} résultats`);
      }
      
      // ✅ DEBUG: Si toujours rien, afficher tous les emails
      if (reclamations.length === 0) {
        console.log('❌ AUCUNE RÉCLAMATION TROUVÉE - DEBUG COMPLET');
        const all = await this.reclamationModel.find().exec();
        console.log(`📊 Total réclamations en DB: ${all.length}`);
        
        if (all.length > 0) {
          const uniqueEmails = [...new Set(all.map(r => r.restaurantEmail))];
          console.log('📧 Emails uniques dans la DB:', uniqueEmails);
          
          console.log('🔍 Comparaison des emails:');
          uniqueEmails.forEach(email => {
            console.log(`  "${email}" === "${normalizedEmail}" ?`, email === normalizedEmail);
            console.log(`  Longueur: ${email?.length} vs ${normalizedEmail.length}`);
            console.log(`  Bytes:`, Buffer.from(email || '').toString('hex'), 'vs', Buffer.from(normalizedEmail).toString('hex'));
          });
        }
      }
      
      console.log(`✅ Total final: ${reclamations.length} réclamation(s) pour ${normalizedEmail}`);
      return reclamations;
      
    } catch (error) {
      console.error('❌ Erreur findByRestaurantEmail:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const reclamation = await this.reclamationModel.findById(id).exec();
    if (!reclamation) throw new NotFoundException('Réclamation non trouvée');
    return reclamation;
  }

  async update(id: string, updateReclamationDto: UpdateReclamationDto) {
    const updated = await this.reclamationModel
      .findByIdAndUpdate(id, updateReclamationDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Réclamation non trouvée');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.reclamationModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Réclamation non trouvée');
    return deleted;
  }

  async respondToReclamation(id: string, dto: RespondReclamationDto, responder: string) {
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
    console.log('✅ Réponse ajoutée à la réclamation:', updated._id);
    return updated;
  }
}