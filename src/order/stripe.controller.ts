// src/stripe/stripe.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { StripeService } from '../order/StripeService';

@Controller('payments')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create')
  createPayment(@Body() body: { amount: number }) {
    return this.stripeService.createPayment(body.amount);
  }
}
