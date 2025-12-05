import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartService } from './cartitem.service';
import { CartController } from './cartitem.controller';
import { Cart, CartSchema } from './schema/cartitem.schema'; 

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [
    MongooseModule,   // ✅ Export model so other modules can inject CartModel
    CartService       // Optional
  ],
})
export class CartitemModule {}
