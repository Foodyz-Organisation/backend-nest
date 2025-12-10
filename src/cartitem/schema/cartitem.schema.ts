import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserAccount } from 'src/useraccount/schema/useraccount.schema';
import { IntensityType } from '../../menuitem/schema/intensity-type.enum';

export type CartDocument = Cart & Document;

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  name: string;

@Prop({
    type: [{
      name: String,
      isDefault: Boolean,
      intensityType: { type: String, enum: Object.values(IntensityType), required: false },
      intensityColor: { type: String, required: false },
      intensityValue: { type: Number, min: 0, max: 1, required: false }, // ✅ ADD THIS
    }],
    _id: false,
  })
  chosenIngredients: {
    name: string;
    isDefault: boolean;
    intensityType?: IntensityType;
    intensityColor?: string;
    intensityValue?: number; // ✅ ADD THIS (0.0 to 1.0)
  }[];


  @Prop({ type: [{ name: String, price: Number }], _id: false })
  chosenOptions: { name: string; price: number }[];

  @Prop({ required: true })
  calculatedPrice: number;  // frontend or backend calculated
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: UserAccount.name, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
