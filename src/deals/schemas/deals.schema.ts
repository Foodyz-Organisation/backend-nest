import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type DealsDocument = Deals & Document;
@Schema({ timestamps: true })
export class Deals {
  @Prop({ type: Types.ObjectId, ref: 'ProfessionalAccount', required: true })
  professionalId: Types.ObjectId; // Restaurant that owns this deal

  @Prop({ required: true })
  restaurantName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  image: string; // URL ou chemin vers l'image

  @Prop({ required: true })
  category: string; // ex: "Street Food", "Gastronomie", etc.

  @Prop({ required: true, min: 0, max: 100 })
  discountPercentage: number; // Discount percentage (e.g., 40, 50, 70)

  @Prop({ type: [{ type: Types.ObjectId, ref: 'MenuItem' }], default: [] })
  applicableMenuItems: Types.ObjectId[]; // Specific menu items this deal applies to (empty = all items)

  @Prop({ type: [String], default: [] })
  applicableCategories: string[]; // Menu categories this deal applies to (empty = all categories)

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const DealsSchema = SchemaFactory.createForClass(Deals);
