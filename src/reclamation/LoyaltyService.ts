import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAccount, UserDocument } from 'src/useraccount/schema/useraccount.schema';

// ✅ EXPORTER les interfaces
export interface LoyaltyResult {
  pointsAwarded: number;
  totalPoints: number;
  reliabilityScore: number;
  reason: string;
}

export interface PointsBalance {
  loyaltyPoints: number;
  validReclamations: number;
  invalidReclamations: number;
  reliabilityScore: number;
  history: Array<{
    points: number;
    reason: string;
    reclamationId: string;
    date: Date;
  }>;
}

export interface Reward {
  name: string;
  pointsCost: number;
  available: boolean;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectModel(UserAccount.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * ✅ Attribue des points pour une réclamation validée
   */
  async awardPoints(
    userId: string,
    reclamationId: string,
    isValid: boolean,
    confidenceScore: number
  ): Promise<LoyaltyResult | null> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.error(`❌ User ${userId} introuvable`);
        return null;
      }

      let pointsToAdd = 0;
      let reason = '';

      if (isValid) {
        // Réclamation valide
        pointsToAdd = parseInt(process.env.LOYALTY_POINTS_VALID_RECLAMATION || '50');

        // Bonus pour haute confiance
        if (confidenceScore >= 90) {
          pointsToAdd += 20;
          reason = 'Réclamation validée avec haute confiance';
        } else {
          reason = 'Réclamation validée';
        }

        // Bonus pour historique fiable
        if (user.reliabilityScore >= 90 && user.validReclamationsCount >= 5) {
          const bonus = Math.floor(pointsToAdd * 0.5);
          pointsToAdd += bonus;
          reason += ` + bonus fidélité (${bonus})`;
        }

        user.validReclamationsCount += 1;

      } else {
        // Réclamation rejetée
        pointsToAdd = parseInt(process.env.LOYALTY_POINTS_INVALID_RECLAMATION || '-10');
        reason = 'Réclamation rejetée';
        user.invalidReclamationsCount += 1;
      }

      // Mise à jour des points
      user.loyaltyPoints += pointsToAdd;

      // Mise à jour du score de fiabilité
      const totalReclamations = user.validReclamationsCount + user.invalidReclamationsCount;
      if (totalReclamations > 0) {
        user.reliabilityScore = Math.round(
          (user.validReclamationsCount / totalReclamations) * 100
        );
      }

      // Historique
      user.pointsHistory.push({
        points: pointsToAdd,
        reason,
        reclamationId,
        date: new Date(),
      });

      await user.save();

      this.logger.log(
        `💰 Points attribués: ${pointsToAdd} à ${user.username} (Total: ${user.loyaltyPoints})`
      );

      return {
        pointsAwarded: pointsToAdd,
        totalPoints: user.loyaltyPoints,
        reliabilityScore: user.reliabilityScore,
        reason,
      };

    } catch (error) {
      this.logger.error('❌ Erreur attribution points:', error);
      throw error;
    }
  }

  /**
   * 📊 Récupère le solde de points
   */
  async getPointsBalance(userId: string): Promise<PointsBalance | null> {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    return {
      loyaltyPoints: user.loyaltyPoints,
      validReclamations: user.validReclamationsCount,
      invalidReclamations: user.invalidReclamationsCount,
      reliabilityScore: user.reliabilityScore,
      history: user.pointsHistory.slice(-10), // 10 dernières transactions
    };
  }

  /**
   * 🎁 Vérifie les récompenses disponibles
   */
  async checkAvailableRewards(userId: string): Promise<Reward[]> {
    const user = await this.userModel.findById(userId);
    if (!user) return [];

    const rewards: Reward[] = [
      { name: 'Réduction 10%', pointsCost: 100, available: user.loyaltyPoints >= 100 },
      { name: 'Réduction 20%', pointsCost: 200, available: user.loyaltyPoints >= 200 },
      { name: 'Plat gratuit', pointsCost: 500, available: user.loyaltyPoints >= 500 },
      { name: 'Livraison gratuite', pointsCost: 150, available: user.loyaltyPoints >= 150 },
    ];

    return rewards.filter(r => r.available);
  }
}