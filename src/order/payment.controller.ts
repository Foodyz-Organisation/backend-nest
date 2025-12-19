import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService } from './payement.service';
import { StripeService } from './StripeService';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('card')
  async createCardPayment(@Body() body: { amount: number; currency?: string }) {
    // Create Stripe PaymentIntent first
    const stripePayment = await this.stripeService.createPayment(
      Math.round(body.amount * 100), // Convert to cents
      body.currency || 'usd',
    );

    // Create payment record in DB
    const payment = await this.paymentService.createCardPayment(
      Math.round(body.amount * 100),
      body.currency || 'usd',
      stripePayment.paymentIntentId,
    );

    return {
      payment,
      clientSecret: stripePayment.clientSecret,
      paymentIntentId: stripePayment.paymentIntentId,
    };
  }

  @Post('cash')
  createCashPayment(@Body() body: { amount: number; currency?: string }) {
    return this.paymentService.createCashPayment(
      Math.round(body.amount * 100), // Convert to cents
      body.currency || 'usd',
    );
  }
}
