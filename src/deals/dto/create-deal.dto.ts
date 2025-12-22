import { IsString, IsBoolean, IsDateString, IsOptional, IsNumber, IsArray, IsMongoId, Min, Max } from 'class-validator';

export class CreateDealDto {
  @IsMongoId()
  professionalId: string; // Restaurant ID

  @IsString()
  restaurantName: string;

  @IsString()
  description: string;

  @IsString()
  image: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number; // Discount percentage (e.g., 40%, 50%, 70%)

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableMenuItems?: string[]; // Optional: specific menu items (empty = all items)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[]; // Optional: categories (e.g., ['PIZZA', 'BURGER'])

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
