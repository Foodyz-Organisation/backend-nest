import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReclamationDocument = Reclamation & Document;

@Schema({ timestamps: true })
export class Reclamation {
  @Prop({ required: true })
  nomClient: string;

  @Prop({ required: false })  // ✅ Changé de true à false
  emailClient?: string; 

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  commandeConcernee: string;

  @Prop({ required: true })
  complaintType: string;

  @Prop({ default: 'en_attente' })
  statut: string; // 'en_attente' | 'en_cours' | 'résolue'

  @Prop()
  image?: string; // 👈 champ optionnel pour l'image

  @Prop({ required: true })
  userId: string;
   @Prop({ default: 'ouaghlani.manel@esprit.tn' })
  restaurantEmail?: string;

  // Optionnellement aussi un id de resto
  @Prop({ default: '69245d58871665d54c49a07a' })
  restaurantId?: string;
  @Prop()
  responseMessage?: string;

  @Prop()
  respondedBy?: string; // id ou email du restaurateur

  @Prop()
  respondedAt?: Date;
}

export const ReclamationSchema = SchemaFactory.createForClass(Reclamation);
