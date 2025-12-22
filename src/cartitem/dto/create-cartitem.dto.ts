import { Types } from 'mongoose';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsString,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntensityType } from '../../menuitem/schema/intensity-type.enum';

class IngredientDto {
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  isDefault: boolean;

  @IsOptional()
  @IsEnum(IntensityType)
  intensityType?: IntensityType;

  @IsOptional()
  @IsString()
  intensityColor?: string;

  // ✅ ADD THIS:
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  intensityValue?: number; // 0.0 to 1.0
}

class OptionDto {
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class AddToCartDto {
  @IsMongoId()
  menuItemId: Types.ObjectId;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty() 
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  chosenIngredients: IngredientDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  chosenOptions: OptionDto[];

  @IsNumber()
  @IsPositive()
  calculatedPrice: number; // Price to use (can be discounted or original)

  @IsOptional()
  @IsNumber()
  originalPrice?: number; // Original price before discount (if deal is active)

  @IsOptional()
  @IsNumber()
  discountPercentage?: number; // Discount percentage applied (if any)

  @IsOptional()
  @IsMongoId()
  dealId?: string; // Deal applied to this item (if any)
}
