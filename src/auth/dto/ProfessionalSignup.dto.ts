import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNotEmpty, IsMongoId, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

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

export class ProfessionalSignupDto {
  @ApiProperty({ description: 'Email address of the professional', example: 'pro@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Full name of the professional', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Optional license number', example: 'LIC123456' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ description: 'Optional uploaded documents (file paths)', example: ['/uploads/license.pdf'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiProperty({ description: 'Optional link to a normal user', example: '64f1a2...' })
  @IsOptional()
  @IsMongoId()
  linkedUserId?: string;

  @ApiProperty({ description: 'Optional locations', type: [LocationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations?: LocationDto[];
}
