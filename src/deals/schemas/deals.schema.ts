import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type DealsDocument = Deals & Document;
@Schema({ timestamps: true })
export class Deals {
  @Prop({ required: true })
  restaurantName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  image: string; // URL ou chemin vers l'image

  @Prop({ required: true })
  category: string; // ex: "Street Food", "Gastronomie", etc.

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const DealsSchema = SchemaFactory.createForClass(Deals);
