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
      console.log(`⚠️ LEGACY METHOD: confirmPaymentWithMethod`);
      console.log(`   PaymentMethod ID: ${paymentMethodId}`);
      
      // Confirm the PaymentIntent with the PaymentMethod
      const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      console.log(`✅ Payment confirmed! Status: ${confirmedIntent.status}`);
      return { status: confirmedIntent.status };
    } catch (error) {
      console.error('❌ Stripe payment confirmation failed:', error);
      throw new InternalServerErrorException(`Payment failed: ${error.message}`);
    }
  }

  /**
   * ⭐ NEW: Confirm payment with card details (SECURE METHOD)
   * Creates PaymentMethod server-side from card details, then confirms payment
   * Card details are NEVER stored in your database - only in Stripe (PCI-DSS compliant)
   */
  async confirmPaymentWithCardDetails(
    paymentIntentId: string,
    cardNumber: string,
    expMonth: number,
    expYear: number,
    cvc: string,
    cardholderName: string,
  ): Promise<{ status: string; paymentMethodId: string }> {
    try {
      console.log('💳 ========== STRIPE PAYMENT WITH CARD DETAILS ==========');
      console.log(`📋 PaymentIntent ID: ${paymentIntentId}`);
      console.log(`💳 Creating PaymentMethod from card details...`);
      console.log(`   Card Holder: ${cardholderName}`);
      console.log(`   Card Number: ${cardNumber.slice(0, 4)}...${cardNumber.slice(-4)}`);
      console.log(`   Expiry: ${expMonth}/${expYear}`);
      console.log(`🔒 Card details will NOT be stored in database (Stripe stores them securely)`);
      
      // ⭐ STEP 1: Create PaymentMethod from card details
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cvc,
        },
        billing_details: {
          name: cardholderName,
        },
      });

      console.log(`✅ PaymentMethod created: ${paymentMethod.id}`);
      console.log(`🔒 Card details are now securely stored by Stripe (PCI-DSS compliant)`);

      // ⭐ STEP 2: Confirm PaymentIntent with the PaymentMethod
      console.log(`🔄 Confirming payment with PaymentMethod ${paymentMethod.id}...`);
      const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethod.id,
      });

      console.log(`✅ Payment confirmed! Status: ${confirmedIntent.status}`);
      console.log(`📊 Amount: ${confirmedIntent.amount / 100} ${confirmedIntent.currency.toUpperCase()}`);
      
      if (confirmedIntent.status === 'succeeded') {
        console.log(`💰 Payment successful! Charge ID: ${confirmedIntent.latest_charge}`);
      } else {
        console.log(`⚠️ Payment status: ${confirmedIntent.status}`);
      }
      
      console.log('✅ ========== PAYMENT COMPLETE ==========');
      
      return { 
        status: confirmedIntent.status,
        paymentMethodId: paymentMethod.id 
      };
    } catch (error) {
      console.error('❌ Stripe payment error:', error);
      
      if (error.type === 'StripeCardError') {
        console.error(`❌ Card Error: ${error.message}`);
        throw new InternalServerErrorException(`Card error: ${error.message}`);
      } else if (error.type === 'StripeInvalidRequestError') {
        console.error(`❌ Invalid Request: ${error.message}`);
        throw new InternalServerErrorException(`Invalid request: ${error.message}`);
      } else {
        console.error(`❌ Unknown Error: ${error.message}`);
        throw new InternalServerErrorException(`Payment failed: ${error.message}`);
      }
    }
  }
}
