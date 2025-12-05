import { Types } from 'mongoose';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class IngredientDto {
  @IsNotEmpty()
  name: string;

  @IsBoolean()   // ✅ add this
  isDefault: boolean;
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
  calculatedPrice: number;
}
