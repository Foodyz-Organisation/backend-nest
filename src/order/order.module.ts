import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from './schema/order.schema';
import { CartitemModule } from 'src/cartitem/cartitem.module';
import { OrderTrackingGateway } from '../order/websocket/order-tracking.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
    CartitemModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderTrackingGateway,   
  ],
  exports: [
    OrderService,
  ],
})
export class OrderModule {}
