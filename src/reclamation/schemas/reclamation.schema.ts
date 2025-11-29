import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReclamationDocument = Reclamation & Document;

@Schema({ timestamps: true })
export class Reclamation {
  @Prop({ required: true })
  nomClient: string;

  @Prop({ required: false })
  emailClient?: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  commandeConcernee: string;

  @Prop({ required: true })
  complaintType: string;

  @Prop({ default: 'en_attente' })
  statut: string; // 'en_attente' | 'en_cours' | 'resolue' | 'rejetee'

  @Prop({ type: [String], default: [] })
  photos?: string[];

  @Prop({ required: true })
  userId: string;

  @Prop({ default: 'menyar.benghorbel@esprit.tn' })
  restaurantEmail?: string;

  @Prop({ default: '69245cbc871665d54c49a075' })
  restaurantId?: string;

  @Prop()
  responseMessage?: string;

  @Prop()
  respondedBy?: string;

  @Prop()
  respondedAt?: Date;

  // ✅ NOUVEAU : Validation IA
  @Prop({ default: false })
  aiProcessed: boolean;

  @Prop({ type: Object })
  aiValidation?: {
    isValid: boolean;
    confidenceScore: number; // 0-100
    imageAnalysis: {
      detectedObjects: string[];
      foodQualityScore: number;
      issuesDetected: string[];
    };
    textAnalysis: {
      sentiment: string;
      keywords: string[];
      severity: string;
    };
    matchScore: number; // Cohérence image/description (0-100)
    recommendation: string;
    processedAt: Date;
  };

  @Prop({ default: 0 })
  pointsAwarded: number; // Points attribués au client

  @Prop()
  aiProcessingError?: string;
}

export const ReclamationSchema = SchemaFactory.createForClass(Reclamation);