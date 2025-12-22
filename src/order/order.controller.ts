import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('orders')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  // -----------------------------
  // CREATE ORDER (From OrderConfirmation screen)
  // POST /orders
  // Body: { userId, professionalId, orderType, items, totalPrice, ... }
  // -----------------------------
  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }

  // -----------------------------
  // GET USER'S ORDERS (Order History)
  // GET /orders/user/:userId
  // -----------------------------
  @Get('user/:userId')
  getOrdersByUser(@Param('userId') userId: string) {
    return this.orderService.getOrdersByUser(userId);
  }

  // -----------------------------
  // GET RESTAURANT'S ORDERS
  // GET /orders/professional/:professionalId
  // -----------------------------
  @Get('professional/:professionalId')
  getOrdersByProfessional(@Param('professionalId') professionalId: string) {
    return this.orderService.getOrdersByProfessional(professionalId);
  }

  // -----------------------------
  // GET PENDING ORDERS (Restaurant Dashboard)
  // GET /orders/professional/:professionalId/pending
  // -----------------------------
  @Get('professional/:professionalId/pending')
  getPendingOrders(@Param('professionalId') professionalId: string) {
    return this.orderService.getPendingOrders(professionalId);
  }

  // -----------------------------
  // GET SINGLE ORDER DETAILS
  // GET /orders/:orderId
  // -----------------------------
  @Get(':orderId')
  getOrderById(@Param('orderId') orderId: string) {
    return this.orderService.getOrderById(orderId);
  }

  // -----------------------------
  // UPDATE ORDER STATUS (Restaurant confirms/refuses)
  // PATCH /orders/:orderId/status
  // Body: { status: 'confirmed' | 'refused' | 'completed' | 'cancelled' }
  // -----------------------------
  @Patch(':orderId/status')
  updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.orderService.updateStatus(orderId, dto);
  }

  @Delete('user/:userId')  // ✅ Must be BEFORE @Delete(':id')
  async deleteAllOrdersByUser(@Param('userId') userId: string): Promise<{ message: string }> {
    await this.orderService.deleteAllOrdersByUser(userId);
    return { message: 'All orders deleted successfully' };
  }

  // -----------------------------
  // DELETE ALL ORDERS FOR PROFESSIONAL
  // -----------------------------
@Delete('professional/:professionalId')
async deleteAllOrdersByProfessional(
  @Param('professionalId') professionalId: string
): Promise<{ message: string }> {
  await this.orderService.deleteAllOrdersByProfessional(professionalId);
  return { message: 'All completed orders deleted successfully' };
}

  // -----------------------------
  // DELETE SINGLE ORDER
  // -----------------------------
  @Delete(':id')  // ✅ Generic route comes LAST
  async deleteOrder(@Param('id') orderId: string): Promise<{ message: string }> {
    await this.orderService.deleteOrder(orderId);
    return { message: 'Order deleted successfully' };
  }

  // -----------------------------
  // CONFIRM CARD PAYMENT
  // POST /orders/payment/confirm
  // ⭐ NEW: Accepts card details directly (creates PaymentMethod server-side)
  // -----------------------------
  @Post('payment/confirm')
  async confirmPayment(@Body() body: {
    paymentIntentId: string;
    // Optional: for legacy support (pre-existing PaymentMethod ID)
    paymentMethodId?: string;
    // ⭐ NEW: Card details for server-side PaymentMethod creation
    cardNumber?: string;
    expMonth?: number;
    expYear?: number;
    cvc?: string;
    cardholderName?: string;
  }) {
    console.log('📥 ========== PAYMENT CONFIRMATION REQUEST ==========');
    console.log(`📋 PaymentIntent ID: ${body.paymentIntentId}`);
    console.log(`📦 Request body keys:`, Object.keys(body));
    
    // ⚠️ Detect fake PaymentMethod IDs from frontend (starts with pm_android_ or pm_ios_)
    const isFakePaymentMethodId = body.paymentMethodId && 
      (body.paymentMethodId.startsWith('pm_android_') || 
       body.paymentMethodId.startsWith('pm_ios_'));
    
    if (isFakePaymentMethodId) {
      console.log(`🚨 DETECTED FAKE PaymentMethod ID: ${body.paymentMethodId}`);
      console.log(`💡 Frontend must send card details instead of fake PaymentMethod ID`);
      console.log(`🔴 REQUIRED FIELDS: cardNumber, expMonth, expYear, cvc, cardholderName`);
      
      throw new BadRequestException({
        message: 'Invalid PaymentMethod ID. Please send card details instead.',
        error: 'Frontend must send: cardNumber, expMonth, expYear, cvc, cardholderName',
        hint: 'The PaymentMethod ID you sent is not a real Stripe PaymentMethod. Send raw card details instead.',
        requiredFields: ['paymentIntentId', 'cardNumber', 'expMonth', 'expYear', 'cvc', 'cardholderName'],
        receivedFields: Object.keys(body),
      });
    }
    
    // Check if card details are provided (new method)
    if (body.cardNumber && body.expMonth && body.expYear && body.cvc && body.cardholderName) {
      console.log(`💳 Card Holder: ${body.cardholderName}`);
      console.log(`📅 Expiry: ${body.expMonth}/${body.expYear}`);
      console.log(`🔒 Card details received (will be sent to Stripe, NOT stored in DB)`);
      console.log(`✅ Using NEW confirmPaymentWithCardDetails method`);

      return this.orderService.confirmPaymentWithCardDetails(
        body.paymentIntentId,
        {
          cardNumber: body.cardNumber,
          expMonth: body.expMonth,
          expYear: body.expYear,
          cvc: body.cvc,
          cardholderName: body.cardholderName,
        }
      );
    } 
    // Legacy: Real PaymentMethod ID provided (from Stripe)
    else if (body.paymentMethodId) {
      console.log(`💳 PaymentMethod ID: ${body.paymentMethodId}`);
      console.log(`⚠️ Using LEGACY confirmPayment method`);
      return this.orderService.confirmPayment(body.paymentIntentId, body.paymentMethodId);
    }
    // No payment details provided - ERROR
    else {
      console.log(`🚨 NO PAYMENT DETAILS PROVIDED`);
      console.log(`📦 Received fields:`, Object.keys(body));
      
      throw new BadRequestException({
        message: 'Missing payment details',
        error: 'Must provide either card details OR a valid Stripe PaymentMethod ID',
        requiredFields: {
          option1: ['paymentIntentId', 'cardNumber', 'expMonth', 'expYear', 'cvc', 'cardholderName'],
          option2: ['paymentIntentId', 'paymentMethodId (real Stripe PM ID)']
        },
        receivedFields: Object.keys(body),
      });
    }
  }

  
}
