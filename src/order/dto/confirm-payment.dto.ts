import { IsNotEmpty, IsString, IsOptional, ValidateIf, IsNumber } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  // PaymentMethod ID (from Stripe SDK - iOS/Web)
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.cardNumber)  // Required only if cardNumber is not provided
  paymentMethodId?: string;

  // Card details (for Android without Stripe SDK)
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.paymentMethodId)  // Required only if paymentMethodId is not provided
  cardNumber?: string;

  @IsNumber()
  @ValidateIf((o) => !o.paymentMethodId)
  expMonth?: number;

  @IsNumber()
  @ValidateIf((o) => !o.paymentMethodId)
  expYear?: number;

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.paymentMethodId)
  cvv?: string;

  @IsString()
  @IsOptional()
  cardholderName?: string;
}