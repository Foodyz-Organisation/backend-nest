import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsNumber
} from 'class-validator';
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

export class CreateProfessionalDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  // Paths or filenames only (simple)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @IsOptional()
  @IsMongoId()
  linkedUserId?: string;

  @ApiProperty({ description: 'Optional locations array', type: [LocationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations?: LocationDto[];
}
