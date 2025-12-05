import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderType } from './enums/order-type.enum';
import { OrderStatus } from './enums/order-status.enum';

export type OrderDocument = Order & Document;

// OrderItem Subdocument - Mirrors CartItem structure
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // Snapshot of item name (in case menu item is deleted later)

  @Prop({ required: true })
  quantity: number;

  @Prop({ type: [{ name: String, isDefault: Boolean }], default: [] })
  chosenIngredients: { name: string; isDefault: boolean }[];

  @Prop({ type: [{ name: String, price: Number }], default: [] })
  chosenOptions: { name: string; price: number }[];

  @Prop({ required: true })
  calculatedPrice: number; // Final price per item (base + options)
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Main Order Schema
@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'UserAccount', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProfessionalAccount', required: true })
  professionalId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ type: String, enum: OrderType, required: true })
  orderType: OrderType; // 'eat-in' | 'takeaway' | 'delivery'

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus; // 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refused'

  @Prop()
  scheduledTime?: Date; // Optional: for future orders

  @Prop()
  deliveryAddress?: string; // Optional: for delivery orders

  @Prop()
  notes?: string; // Optional: customer notes
}

export const OrderSchema = SchemaFactory.createForClass(Order);
