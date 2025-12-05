import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schema/cartitem.schema';
import { AddToCartDto } from './dto/create-cartitem.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {}

  async getUserCart(userId: string): Promise<CartDocument> {
  let cart = await this.cartModel.findOne({ userId }).exec();
  
  if (!cart) {
    cart = new this.cartModel({ userId, items: [] });
    await cart.save();
  }

  return cart; // now it's a CartDocument with .save()
}


  async addItem(userId: string, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.getUserCart(userId);

    cart.items.push(dto);
    return cart.save();
  }

  async updateQuantity(
    userId: string,
    itemIndex: number,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getUserCart(userId);

    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Item not found in cart');
    }

    cart.items[itemIndex].quantity = quantity;

    return cart.save();
  }

  async removeItem(userId: string, itemIndex: number): Promise<Cart> {
    const cart = await this.getUserCart(userId);

    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Item not found');
    }

    cart.items.splice(itemIndex, 1);

    return cart.save();
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.getUserCart(userId);
    cart.items = [];
    return cart.save();
  }
}
