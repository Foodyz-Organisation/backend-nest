import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  nom: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  date_debut: string; // ✅ Changé de Date à string

  @Prop({ required: true })
  date_fin: string; 

  @Prop()
  image?: string; // URL optionnelle

  @Prop({ required: true })
  lieu: string;

  @Prop({ required: true })
  categorie: string;

  @Prop({
    required: true,
    enum: ['à venir', 'en cours', 'terminé'],
    default: 'à venir',
  })
  statut: string;

  @Prop({ type: String, required: false })
  organisateur_id?: string; // référence à l’admin ou manager
}

export const EventSchema = SchemaFactory.createForClass(Event);
