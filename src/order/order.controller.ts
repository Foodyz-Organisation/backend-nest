import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe
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
  // Body: { paymentIntentId: string, paymentMethodId: string }
  // Note: Frontend should use Stripe SDK to create PaymentMethod from card details,
  //       then send the PaymentMethod ID (pm_xxx) to this endpoint.
  // -----------------------------
  @Post('payment/confirm')
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.orderService.confirmPayment(dto.paymentIntentId, dto.paymentMethodId);
  }

  
}
