import { IsOptional, IsString, IsBoolean, IsArray, IsObject, ValidateNested, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({ description: 'Optional name of the branch', example: 'Main Branch', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Optional human-readable address', example: 'Rue de Paris, Tunis', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Latitude of the location (required)', example: 36.8065 })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({ description: 'Longitude of the location (required)', example: 10.1815 })
  @IsNumber()
  @IsNotEmpty()
  lon: number;
}

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

  @ApiProperty({ description: 'Optional locations array - replaces existing locations', type: [LocationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations?: LocationDto[];
  
   @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiProperty({ description: 'Firebase Cloud Messaging token for push notifications', required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;

}
