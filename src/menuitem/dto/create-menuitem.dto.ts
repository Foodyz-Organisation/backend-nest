import { IsNotEmpty, IsNumber, IsString, IsArray, IsEnum, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Category } from '../schema/menu-category.enum';

// DTO for items within the ingredients array
export class IngredientDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsBoolean()
    isDefault: boolean;
}

// DTO for items within the options array
export class OptionDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNumber()
    @IsNotEmpty()
    price: number;
}

// Main DTO for creating a new MenuItem
export class CreateMenuItemDto {
  @IsNotEmpty()
  // Assuming the ObjectId comes as a string in the request body
  professionalId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsEnum(Category)
  category: Category;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients: IngredientDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
  
  // This property will be filled by the controller after file upload
  @IsOptional()
  @IsString() 
  image?: string; 
}