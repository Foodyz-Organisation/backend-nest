import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { Cart, CartDocument } from '../cartitem/schema/cartitem.schema';
import { OrderStatus } from './schema/enums/order-status.enum';
import { OrderType } from './schema/enums/order-type.enum';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) { }

  // -----------------------------
  // CREATE ORDER FROM CART
  // -----------------------------
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // 1. Validate cart exists and has items
    const cart = await this.cartModel.findOne({ userId: dto.userId }).lean();

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty. Cannot create order.');
    }

    // 2. Validate delivery address if orderType is delivery
    if (dto.orderType === OrderType.DELIVERY && !dto.deliveryAddress) {
      throw new BadRequestException('Delivery address is required for delivery orders');
    }

    // 3. Create order with PENDING status
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
    });

    const savedOrder = await order.save();

    // 4. Clear cart after successful order creation
    await this.cartModel.updateOne({ userId: dto.userId }, { items: [] });

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

    order.status = dto.status;
    return order.save();
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
}
