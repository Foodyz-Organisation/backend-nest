import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderType } from './enums/order-type.enum';
import { OrderStatus } from './enums/order-status.enum';
import { IntensityType } from '../../menuitem/schema/intensity-type.enum';

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

  @Prop({ 
    type: [{ 
      name: String, 
      isDefault: Boolean,
      intensityType: { type: String, enum: Object.values(IntensityType), required: false },
      intensityColor: { type: String, required: false },
      intensityValue: { type: Number, min: 0, max: 1, required: false } // ✅ ADD THIS
    }], 
    default: [] 
  })
  chosenIngredients: { 
    name: string; 
    isDefault: boolean;
    intensityType?: IntensityType;
    intensityColor?: string;
    intensityValue?: number; // ✅ ADD THIS (0.0 to 1.0)
  }[];

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
