import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { Cart, CartDocument } from '../cartitem/schema/cartitem.schema';
import { OrderStatus } from './schema/enums/order-status.enum';
import { OrderType } from './schema/enums/order-type.enum';
import { PaymentService } from './payement.service';
import { StripeService } from './StripeService';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/schema/notification.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private paymentService: PaymentService,
    private stripeService: StripeService,
    private notificationService: NotificationService,
  ) { }

  // -----------------------------
  // CREATE ORDER FROM CART
  // -----------------------------
  async createOrder(dto: CreateOrderDto): Promise<Order | { order: Order; clientSecret?: string; paymentIntentId?: string }> {
    // 1. Validate cart exists and has items
    const cart = await this.cartModel.findOne({ userId: dto.userId }).lean();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty. Cannot create order.');
    }

    // 2. Validate delivery address if orderType is delivery
    if (dto.orderType === OrderType.DELIVERY && !dto.deliveryAddress) {
      throw new BadRequestException('Delivery address is required for delivery orders');
    }

    // 3. Handle payment based on payment method
    let paymentId: Types.ObjectId | undefined;
    let clientSecret: string | undefined;
    let paymentIntentId: string | undefined;

    if (dto.paymentMethod === 'CASH') {
      // CASH: Create cash payment immediately
      const cashPayment = await this.paymentService.createCashPayment(
        Math.round(dto.totalPrice * 100), // Convert to cents
        'usd',
      );
      paymentId = cashPayment._id as Types.ObjectId;
    } else if (dto.paymentMethod === 'CARD') {
      // CARD: Create Stripe PaymentIntent (payment not confirmed yet)
      const stripePayment = await this.stripeService.createPayment(
        Math.round(dto.totalPrice * 100), // Convert to cents (Stripe uses smallest currency unit)
        'usd',
      );
      clientSecret = stripePayment.clientSecret;
      paymentIntentId = stripePayment.paymentIntentId;

      // Create payment record in DB with PaymentIntent ID
      const cardPayment = await this.paymentService.createCardPayment(
        Math.round(dto.totalPrice * 100),
        'usd',
        paymentIntentId,
      );
      paymentId = cardPayment._id as Types.ObjectId;
    }

    // 4. Create order with PENDING status
    const order = new this.orderModel({
      userId: dto.userId,
      professionalId: dto.professionalId,
      items: dto.items, // Cart items snapshot
      totalPrice: dto.totalPrice,
      orderType: dto.orderType,
      status: OrderStatus.PENDING, // Always starts as PENDING
      deliveryAddress: dto.deliveryAddress,
      notes: dto.notes,
      scheduledTime: dto.scheduledTime,
      paymentMethod: dto.paymentMethod,
      paymentId: paymentId,
    });

    const savedOrder = await order.save();

    // Update payment with orderId
    if (paymentId && savedOrder._id) {
      await this.paymentService.updatePaymentOrderId(paymentId.toString(), String(savedOrder._id));
    }

    // 5. Clear cart after successful order creation
    await this.cartModel.updateOne({ userId: dto.userId }, { items: [] });

    // 6. Create notification for professional (new order received)
    try {
      await this.notificationService.createOrderNotification(
        NotificationType.ORDER_CREATED,
        undefined, // Not for user
        String(dto.professionalId), // For professional
        String(savedOrder._id),
        {
          orderStatus: OrderStatus.PENDING,
          totalPrice: dto.totalPrice,
          itemCount: dto.items.length,
          orderType: dto.orderType,
        },
      );
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Don't fail order creation if notification fails
    }

    // 7. If CARD payment, return order + clientSecret for frontend
    if (dto.paymentMethod === 'CARD') {
      return {
        order: savedOrder,
        clientSecret,
        paymentIntentId,
      };
    }

    // If CASH payment, return order normally
    return savedOrder;
  }

  // -----------------------------
  // GET ORDERS BY USER (Order History)
  // -----------------------------
async getOrdersByUser(userId: string): Promise<Order[]> {
  return this.orderModel
    .find({ userId })
    .populate('userId', 'username email')  // ✅ 
    .sort({ createdAt: -1 })
    .lean();
}

  // -----------------------------
  // GET ORDERS BY PROFESSIONAL (Restaurant Dashboard)
  // -----------------------------
// order.service.ts
async getOrdersByProfessional(professionalId: string): Promise<Order[]> {
  return this.orderModel
    .find({ professionalId })
    .populate('userId', 'username email')  // ✅ Change to username
    .sort({ createdAt: -1 })
    .lean();
}
  // -----------------------------
  // GET PENDING ORDERS (For Restaurant)
  // -----------------------------
async getPendingOrders(professionalId: string): Promise<Order[]> {
  return this.orderModel
    .find({ professionalId, status: OrderStatus.PENDING })
    .populate('userId', 'username email')  // ✅
    .sort({ createdAt: 1 })
    .lean();
}


  // -----------------------------
  // UPDATE ORDER STATUS (Restaurant confirms/refuses)
  // -----------------------------
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transition
    this.validateStatusTransition(order.status as OrderStatus, dto.status);

    const oldStatus = order.status;
    order.status = dto.status;
    const savedOrder = await order.save();

    // Create notification for user based on status change
    try {
      let notificationType: NotificationType | null = null;

      switch (dto.status) {
        case OrderStatus.CONFIRMED:
          notificationType = NotificationType.ORDER_CONFIRMED;
          break;
        case OrderStatus.COMPLETED:
          notificationType = NotificationType.ORDER_COMPLETED;
          break;
        case OrderStatus.CANCELLED:
          notificationType = NotificationType.ORDER_CANCELLED;
          break;
        case OrderStatus.REFUSED:
          notificationType = NotificationType.ORDER_REFUSED;
          break;
      }

      if (notificationType) {
        await this.notificationService.createOrderNotification(
          notificationType,
          String(order.userId), // Notify user
          undefined, // Not for professional
          String(savedOrder._id),
          {
            orderStatus: dto.status,
            totalPrice: order.totalPrice,
            itemCount: order.items.length,
            orderType: order.orderType,
            previousStatus: oldStatus,
          },
        );
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Don't fail status update if notification fails
    }

    return savedOrder;
  }

  // -----------------------------
  // GET SINGLE ORDER (Order Details)
  // -----------------------------
  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId).lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // -----------------------------
  // HELPER: Validate Status Transitions
  // -----------------------------
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
  // Allow keeping the same status (no-op)
  if (currentStatus === newStatus) {
    return; // ✅ Allow same status
  }

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.REFUSED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUSED]: [],
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new BadRequestException(
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }
}

async deleteOrder(orderId: string): Promise<void> {
  const order = await this.orderModel.findById(orderId);
  
  if (!order) {
    throw new NotFoundException('Order not found');
  }
  
  // Only allow deletion if status is PENDING or CONFIRMED
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
    throw new BadRequestException('Cannot delete order with status: ' + order.status);
  }
  
  await this.orderModel.findByIdAndDelete(orderId);
}

// -----------------------------
// DELETE ALL ORDERS FOR USER
// -----------------------------
async deleteAllOrdersByUser(userId: string): Promise<void> {
  await this.orderModel.deleteMany({ userId });
}

// -----------------------------
// DELETE ALL ORDERS FOR PROFESSIONAL
// -----------------------------
async deleteAllOrdersByProfessional(professionalId: string): Promise<void> {
  // Only delete orders with status COMPLETED
  await this.orderModel.deleteMany({ 
    professionalId,
    status: OrderStatus.COMPLETED  // ✅ Only delete completed orders
  });
}

  // -----------------------------
  // CONFIRM CARD PAYMENT
  // -----------------------------
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<{ success: boolean; order?: Order }> {
    try {
      // 1. Get payment from DB
      const payment = await this.paymentService.getPaymentByIntentId(paymentIntentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // 2. If PaymentMethod ID provided, attach and confirm payment
      // Otherwise, just verify the payment status (already confirmed client-side)
      let stripeStatus: { status: string };

      if (paymentMethodId) {
        // Attach PaymentMethod and confirm payment
        stripeStatus = await this.stripeService.confirmPaymentWithMethod(paymentIntentId, paymentMethodId);
      } else {
        // Payment already confirmed client-side - just verify status
        stripeStatus = await this.stripeService.confirmPayment(paymentIntentId);
      }

      // 3. Update payment status in DB
      if (stripeStatus.status === 'succeeded') {
        await this.paymentService.updatePaymentStatus(paymentIntentId, 'succeeded');

        // 4. Create payment success notification for user
        if (payment.orderId) {
          const order = await this.orderModel.findById(payment.orderId);
          
          try {
            await this.notificationService.createOrderNotification(
              NotificationType.PAYMENT_SUCCESS,
              order ? String(order.userId) : undefined,
              undefined,
              String(payment.orderId),
              {
                totalPrice: payment.amount / 100, // Convert from cents
                paymentMethod: 'CARD',
              },
            );
          } catch (error) {
            console.error('Failed to create payment notification:', error);
          }

          return {
            success: true,
            order: order || undefined,
          };
        }

        return { success: true };
      } else {
        await this.paymentService.updatePaymentStatus(paymentIntentId, stripeStatus.status);
        
        // Create payment failed notification
        if (payment.orderId) {
          try {
            const order = await this.orderModel.findById(payment.orderId);
            await this.notificationService.createOrderNotification(
              NotificationType.PAYMENT_FAILED,
              order ? String(order.userId) : undefined,
              undefined,
              String(payment.orderId),
              {
                paymentStatus: stripeStatus.status,
              },
            );
          } catch (error) {
            console.error('Failed to create payment failed notification:', error);
          }
        }
        
        throw new BadRequestException(`Payment status: ${stripeStatus.status}`);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
}
}
