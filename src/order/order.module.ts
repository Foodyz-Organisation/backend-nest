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
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    CartitemModule,
    NotificationModule, // Import NotificationModule to use NotificationService
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
