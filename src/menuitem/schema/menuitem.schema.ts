import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from './menu-category.enum';
import { IntensityType } from './intensity-type.enum';

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
  price: number; // Original price

  @Prop({ required: false, default: null })
  discountedPrice?: number; // Discounted price (if deal is active)

  @Prop({ type: Types.ObjectId, ref: 'Deals', required: false })
  activeDealId?: Types.ObjectId; // Reference to active deal (if any)

  @Prop({ required: false, default: 0 })
  discountPercentage?: number; // Current discount percentage (if any)

  @Prop({ type: String, enum: Category, required: true })
  category: Category;

  // Ingredients array, required
  @Prop({
    type: [{
      name: String,
      isDefault: Boolean,
      supportsIntensity: { type: Boolean, default: false },
      intensityType: { type: String, enum: Object.values(IntensityType), required: false },
      intensityColor: { type: String, required: false }
    }],
    _id: false,
    required: true
  })
  ingredients: {
    name: string;
    isDefault: boolean;
    supportsIntensity: boolean;
    intensityType?: IntensityType;
    intensityColor?: string;
  }[];

  // Options array, required
  @Prop({ type: [{ name: String, price: Number }], _id: false, required: true })
  options: { name: string; price: number }[];

  // Image path/URL
  @Prop()
  image?: string;

  // Preparation time in minutes (base time for this dish)
  @Prop({ required: true, default: 15, min: 1 })
  preparationTimeMinutes: number;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);