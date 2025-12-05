// schema/order-item.schema.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class OrderItem {

  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  // Save selected ingredients (removed ones or all)
  @Prop({
    type: [{
      name: String,
      isDefault: Boolean,
      isRemoved: Boolean,   // NEW — to track removed ingredient
    }],
    _id: false
  })
  ingredients: { 
    name: string;
    isDefault: boolean;
    isRemoved: boolean;
  }[];

  // Save chosen options (add-ons)
  @Prop({
    type: [{
      name: String,
      price: Number
    }],
    _id: false
  })
  options: { name: string; price: number }[];

  // Final calculated price for this customized item (quantity x item config)
  @Prop({ required: true })
  totalItemPrice: number;
}
