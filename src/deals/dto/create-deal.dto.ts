import { IsString, IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class CreateDealDto {@IsString()
  restaurantName: string;

  @IsString()
  description: string;

  @IsString()
  image: string;

  @IsString()
  category: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;}
