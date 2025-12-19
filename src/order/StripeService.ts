// src/stripe/stripe.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config(); // Make sure .env is loaded

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY is not defined in .env',
      );
    }

this.stripe = new Stripe(secretKey, {
  apiVersion: '2022-11-15' as any,
});
  }

  /**
   * Create a PaymentIntent
   * @param amount Amount in smallest currency unit (e.g., cents)
   * @param currency Currency code (default: 'usd')
   * @returns PaymentIntent with clientSecret and id
   */
  async createPayment(
    amount: number,
    currency: string = 'usd',
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card'],
      });

      return { 
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe PaymentIntent creation failed:', error);
      throw new InternalServerErrorException(
        'Failed to create payment intent',
      );
    }
  }

  /**
   * Confirm a payment intent (verify payment succeeded)
   * @param paymentIntentId Stripe PaymentIntent ID
   * @returns PaymentIntent status
   */
  async confirmPayment(paymentIntentId: string): Promise<{ status: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return { status: paymentIntent.status };
    } catch (error) {
      console.error('Stripe PaymentIntent retrieval failed:', error);
      throw new InternalServerErrorException('Failed to confirm payment');
    }
  }

  /**
   * Confirm payment with PaymentMethod ID (secure method)
   * PaymentMethod should be created client-side using Stripe.js
   * @param paymentIntentId Stripe PaymentIntent ID
   * @param paymentMethodId Stripe PaymentMethod ID (created client-side)
   * @returns PaymentIntent status
   */
  async confirmPaymentWithMethod(
    paymentIntentId: string,
    paymentMethodId: string,
  ): Promise<{ status: string }> {
    try {
      // Attach payment method to PaymentIntent
      await this.stripe.paymentIntents.update(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      // Confirm the PaymentIntent
      const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      return { status: confirmedIntent.status };
    } catch (error) {
      console.error('Stripe payment confirmation failed:', error);
      throw new InternalServerErrorException(`Payment failed: ${error.message}`);
    }
  }
}
