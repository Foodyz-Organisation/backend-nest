import { IsOptional, IsString, IsBoolean, IsArray, IsObject } from 'class-validator';

export class UpdateProfessionalDto {
  @IsOptional()
  @IsString()
  fullName?: string; // business/display name

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  hours?: string;

  @IsOptional()
  @IsObject()
  services?: {
    delivery?: boolean;
    takeaway?: boolean;
    dineIn?: boolean;
  };

  @IsOptional()
  @IsString()
  imageUrl?: string;

  // ✅ Use string array for now
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
