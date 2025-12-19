import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: String, enum: ['CASH', 'CARD'], default: 'CARD' })
  method: 'CASH' | 'CARD';

  @Prop({ required: false })
  paymentIntentId?: string; // Stripe PaymentIntent ID

  @Prop({ required: false })
  status?: string; // 'pending', 'succeeded', 'failed' - Stripe payment status

  @Prop({ type: String, required: false })
  orderId?: string; // Reference to order (for easier lookup)
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
