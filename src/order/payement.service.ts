import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { Payment } from '../order/payement.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(@InjectModel(Payment.name) private paymentModel: Model<Payment>) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new InternalServerErrorException('STRIPE_SECRET_KEY missing');

    this.stripe = new Stripe(secretKey, {}); // Minimal, v20
  }

  // Create card payment with PaymentIntent
  async createCardPayment(
    amount: number, 
    currency: string = 'usd',
    paymentIntentId: string,
    orderId?: string,
  ) {
    try {
      // Save payment in DB with PaymentIntent ID
      const payment = new this.paymentModel({
        amount,
        currency,
        method: 'CARD',
        paymentIntentId,
        status: 'pending',
        orderId,
      });

      return payment.save();
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  // Update payment status
  async updatePaymentStatus(paymentIntentId: string, status: string) {
    try {
      const payment = await this.paymentModel.findOne({ paymentIntentId });
      if (!payment) {
        throw new InternalServerErrorException('Payment not found');
      }
      payment.status = status;
      return payment.save();
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to update payment status');
    }
  }

  // Get payment by PaymentIntent ID
  async getPaymentByIntentId(paymentIntentId: string) {
    return this.paymentModel.findOne({ paymentIntentId });
  }

  // Create cash payment
  async createCashPayment(amount: number, currency: string = 'usd') {
    const payment = new this.paymentModel({
      amount,
      currency,
      method: 'CASH',
      status: 'succeeded', // Cash payments are considered succeeded immediately
    });

    return payment.save();
  }

  // Update payment with orderId
  async updatePaymentOrderId(paymentId: string, orderId: string) {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      if (payment) {
        payment.orderId = orderId;
        return payment.save();
      }
      return null;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to update payment orderId');
    }
  }
}
