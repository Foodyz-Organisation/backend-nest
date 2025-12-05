import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CartService } from './cartitem.service';
import { AddToCartDto } from './dto/create-cartitem.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ---------------------------------------
  // GET USER CART
  // Example: /cart?userId=123
  // ---------------------------------------
  @Get()
  async getCart(@Query('userId') userId: string) {
    return this.cartService.getUserCart(userId);
  }

  // ---------------------------------------
  // ADD ITEM TO CART
  // ---------------------------------------
  @Post('add')
  async addItem(
    @Query('userId') userId: string,
    @Body() dto: AddToCartDto
  ) {
    return this.cartService.addItem(userId, dto);
  }

  // ---------------------------------------
  // UPDATE QUANTITY OF ITEM (by index)
  // ---------------------------------------
  @Patch('update/:itemIndex')
  async updateQuantity(
    @Query('userId') userId: string,
    @Param('itemIndex', ParseIntPipe) itemIndex: number,
    @Body('quantity') quantity: number
  ) {
    return this.cartService.updateQuantity(userId, itemIndex, quantity);
  }

  // ---------------------------------------
  // REMOVE ITEM FROM CART
  // ---------------------------------------
  @Delete('remove/:itemIndex')
  async removeItem(
    @Query('userId') userId: string,
    @Param('itemIndex', ParseIntPipe) itemIndex: number
  ) {
    return this.cartService.removeItem(userId, itemIndex);
  }

  // ---------------------------------------
  // CLEAR CART
  // ---------------------------------------
  @Delete('clear')
  async clearCart(@Query('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
