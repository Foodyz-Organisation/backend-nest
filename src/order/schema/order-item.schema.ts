// schema/order-item.schema.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { IntensityType } from '../../menuitem/schema/intensity-type.enum';

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  name: string;

  @Prop({ 
    type: [{ 
      name: String, 
      isDefault: Boolean,
      intensityType: { type: String, enum: Object.values(IntensityType), required: false },
      intensityColor: { type: String, required: false },
      intensityValue: { type: Number, min: 0, max: 1, required: false } // ✅ ADD THIS
    }], 
    _id: false 
  })
  chosenIngredients: { 
    name: string; 
    isDefault: boolean;
    intensityType?: IntensityType;
    intensityColor?: string;
    intensityValue?: number; // ✅ ADD THIS (0.0 to 1.0)
  }[];

  @Prop({ type: [{ name: String, price: Number }], default: [] })
  chosenOptions: { name: string; price: number }[];

  @Prop({ required: true })
  calculatedPrice: number;
}