# 📦 Complete Order & Payment System - Full Code

This file contains **ALL** the code for the Order and Payment system.

---

## 📁 **1. ORDER SCHEMA** 
**File**: `src/order/schema/order.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderType } from './enums/order-type.enum';
import { OrderStatus } from './enums/order-status.enum';
import { IntensityType } from '../../menuitem/schema/intensity-type.enum';

export type OrderDocument = Order & Document;

// OrderItem Subdocument - Mirrors CartItem structure
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // Snapshot of item name (in case menu item is deleted later)

  @Prop({ required: true })
  quantity: number;

  @Prop({ 
    type: [{ 
      name: String, 
      isDefault: Boolean,
      intensityType: { type: String, enum: Object.values(IntensityType), required: false },
      intensityColor: { type: String, required: false },
      intensityValue: { type: Number, min: 0, max: 1, required: false }
    }], 
    default: [] 
  })
  chosenIngredients: { 
    name: string; 
    isDefault: boolean;
    intensityType?: IntensityType;
    intensityColor?: string;
    intensityValue?: number;
  }[];

  @Prop({ type: [{ name: String, price: Number }], default: [] })
  chosenOptions: { name: string; price: number }[];

  @Prop({ required: true })
  calculatedPrice: number; // Final price per item (base + options)
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Main Order Schema
@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'UserAccount', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProfessionalAccount', required: true })
  professionalId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ type: String, enum: OrderType, required: true })
  orderType: OrderType; // 'eat-in' | 'takeaway' | 'delivery'

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus; // 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refused'

  @Prop()
  scheduledTime?: Date; // Optional: for future orders

  @Prop()
  deliveryAddress?: string; // Optional: for delivery orders

  @Prop()
  notes?: string; // Optional: customer notes

  @Prop({ type: String, enum: ['CASH', 'CARD'], required: true })
  paymentMethod: 'CASH' | 'CARD';

  @Prop({ type: Types.ObjectId, ref: 'Payment', required: false })
  paymentId?: Types.ObjectId; // Reference to Payment document
}

export const OrderSchema = SchemaFactory.createForClass(Order);
```

---

## 📁 **2. PAYMENT SCHEMA**
**File**: `src/order/payement.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: String, enum: ['CASH', 'CARD'], default: 'CARD' })
  method: 'CASH' | 'CARD';

  @Prop({ required: false })
  paymentIntentId?: string; // Stripe PaymentIntent ID

  @Prop({ required: false })
  status?: string; // 'pending', 'succeeded', 'failed' - Stripe payment status

  @Prop({ type: String, required: false })
  orderId?: string; // Reference to order (for easier lookup)
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
```

---

## 📁 **3. ORDER STATUS ENUM**
**File**: `src/order/schema/enums/order-status.enum.ts`

```typescript
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUSED = 'refused',
}
```

---

## 📁 **4. CREATE ORDER DTO**
**File**: `src/order/dto/create-order.dto.ts`

```typescript
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
  IsMongoId,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '../schema/enums/order-type.enum';
import { IntensityType } from '../../menuitem/schema/intensity-type.enum';

// DTO for OrderItem - matches CartItem structure
class OrderItemDto {
  @IsMongoId()
  menuItemId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsArray()
  @IsOptional()
  chosenIngredients?: { 
    name: string; 
    isDefault: boolean;
    intensityType?: IntensityType;
    intensityColor?: string;
    intensityValue?: number;
  }[];

  @IsArray()
  @IsOptional()
  chosenOptions?: { name: string; price: number }[];

  @IsNotEmpty()
  @IsNumber()
  calculatedPrice: number;
}

// Main CreateOrderDto
export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  @IsNotEmpty()
  professionalId: string;

  @IsEnum(OrderType)
  @IsNotEmpty()
  orderType: OrderType; // User selects: 'eat-in' | 'takeaway' | 'delivery'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]; // Cart items passed from frontend

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number; // Total calculated on frontend

  @IsOptional()
  @IsString()
  deliveryAddress?: string; // Required if orderType is 'delivery'

  @IsOptional()
  @IsString()
  notes?: string; // Optional customer notes

  @IsOptional()
  scheduledTime?: Date; // Optional: for future orders

  @IsEnum(['CASH', 'CARD'])
  @IsNotEmpty()
  paymentMethod: 'CASH' | 'CARD'; // Required: payment method selection
}
```

---

## 📁 **5. UPDATE ORDER STATUS DTO**
**File**: `src/order/dto/update-order.dto.ts`

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../schema/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
```

---

## 📁 **6. CONFIRM PAYMENT DTO**
**File**: `src/order/dto/confirm-payment.dto.ts`

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string; // Stripe PaymentIntent ID
}
```

---

## 📁 **7. ORDER SERVICE**
**File**: `src/order/order.service.ts`

```typescript
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

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private paymentService: PaymentService,
    private stripeService: StripeService,
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

    // 6. If CARD payment, return order + clientSecret for frontend
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
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .lean();
  }

  // -----------------------------
  // GET ORDERS BY PROFESSIONAL (Restaurant Dashboard)
  // -----------------------------
  async getOrdersByProfessional(professionalId: string): Promise<Order[]> {
    return this.orderModel
      .find({ professionalId })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .lean();
  }

  // -----------------------------
  // GET PENDING ORDERS (For Restaurant)
  // -----------------------------
  async getPendingOrders(professionalId: string): Promise<Order[]> {
    return this.orderModel
      .find({ professionalId, status: OrderStatus.PENDING })
      .populate('userId', 'username email')
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
      return; // Allow same status
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
      status: OrderStatus.COMPLETED
    });
  }

  // -----------------------------
  // CONFIRM CARD PAYMENT
  // -----------------------------
  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; order?: Order }> {
    try {
      // 1. Get payment from DB
      const payment = await this.paymentService.getPaymentByIntentId(paymentIntentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // 2. Verify payment with Stripe
      const stripeStatus = await this.stripeService.confirmPayment(paymentIntentId);
      
      // 3. Update payment status in DB
      if (stripeStatus.status === 'succeeded') {
        await this.paymentService.updatePaymentStatus(paymentIntentId, 'succeeded');

        // 4. If order exists, return it
        if (payment.orderId) {
          const order = await this.orderModel.findById(payment.orderId);
          return {
            success: true,
            order: order || undefined,
          };
        }

        return { success: true };
      } else {
        await this.paymentService.updatePaymentStatus(paymentIntentId, stripeStatus.status);
        throw new BadRequestException(`Payment status: ${stripeStatus.status}`);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }
}
```

---

## 📁 **8. PAYMENT SERVICE**
**File**: `src/order/payement.service.ts`

```typescript
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
```

---

## 📁 **9. STRIPE SERVICE**
**File**: `src/order/StripeService.ts`

```typescript
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
}
```

---

## 📁 **10. ORDER CONTROLLER**
**File**: `src/order/order.controller.ts`

```typescript
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

  @Delete('user/:userId')  // Must be BEFORE @Delete(':id')
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
  @Delete(':id')  // Generic route comes LAST
  async deleteOrder(@Param('id') orderId: string): Promise<{ message: string }> {
    await this.orderService.deleteOrder(orderId);
    return { message: 'Order deleted successfully' };
  }

  // -----------------------------
  // CONFIRM CARD PAYMENT
  // POST /orders/payment/confirm
  // Body: { paymentIntentId: string }
  // -----------------------------
  @Post('payment/confirm')
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.orderService.confirmPayment(dto.paymentIntentId);
  }
}
```

---

## 📁 **11. PAYMENT CONTROLLER**
**File**: `src/order/payment.controller.ts`

```typescript
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
```

---

## 📁 **12. ORDER MODULE**
**File**: `src/order/order.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PaymentController } from './payment.controller';
import { Order, OrderSchema } from './schema/order.schema';
import { ProfessionalAccount, ProfessionalSchema } from '../professionalaccount/schema/professionalaccount.schema';
import { Payment, PaymentSchema } from './payement.schema';
import { PaymentService } from './payement.service';
import { StripeService } from './StripeService';
import { CartitemModule } from 'src/cartitem/cartitem.module';
import { OrderTrackingGateway } from '../order/websocket/order-tracking.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    CartitemModule,
  ],
  controllers: [OrderController, PaymentController],
  providers: [
    OrderService,
    PaymentService,
    StripeService,
    OrderTrackingGateway,   
  ],
  exports: [
    OrderService,
    PaymentService,
    StripeService,
  ],
})
export class OrderModule {}
```

---

## 🔑 **ENVIRONMENT VARIABLES REQUIRED**

Add to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_xxx  # Your Stripe secret key (get from Stripe dashboard)
```

---

## 📝 **SUMMARY**

This complete code includes:
- ✅ Order Schema with payment fields
- ✅ Payment Schema with Stripe integration
- ✅ Order Service with CASH/CARD payment logic
- ✅ Payment Service for handling payments
- ✅ Stripe Service for Stripe API integration
- ✅ Order Controller with all endpoints
- ✅ Payment Controller for standalone payment endpoints
- ✅ All DTOs for validation
- ✅ Order Module with all dependencies

**Everything needed for the Order & Payment system is in this file!**

