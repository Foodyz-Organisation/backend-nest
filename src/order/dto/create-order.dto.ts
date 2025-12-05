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
  chosenIngredients?: { name: string; isDefault: boolean }[];

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
}
