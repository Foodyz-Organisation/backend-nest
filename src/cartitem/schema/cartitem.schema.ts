import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty } from 'class-validator';
import { Document, Types } from 'mongoose';
import { UserAccount } from 'src/useraccount/schema/useraccount.schema';

export type CartDocument = Cart & Document;

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [{ name: String, isDefault: Boolean }], _id: false })
  chosenIngredients: { name: string; isDefault: boolean }[];

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
