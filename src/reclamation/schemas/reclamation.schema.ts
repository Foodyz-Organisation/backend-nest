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
}

export const ReclamationSchema = SchemaFactory.createForClass(Reclamation);
