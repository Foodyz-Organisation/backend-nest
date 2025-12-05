import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from './menu-category.enum';

export type MenuItemDocument = MenuItem & Document;

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ type: Types.ObjectId, ref: 'ProfessionalAccount', required: true })
  professionalId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: String, enum: Category, required: true })
  category: Category;

  // Ingredients array, required
  @Prop({ type: [{ name: String, isDefault: Boolean }], _id: false, required: true })
  ingredients: { name: string; isDefault: boolean }[];

  // Options array, required
  @Prop({ type: [{ name: String, price: Number }], _id: false, required: true })
  options: { name: string; price: number }[];
  
  // Image path/URL
  @Prop()
  image?: string;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);