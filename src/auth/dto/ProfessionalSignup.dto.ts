import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNotEmpty, IsMongoId, IsArray, ValidateNested, IsNumber, MinLength, IsStrongPassword } from 'class-validator';
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
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  }, {
    message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password: string;

  @ApiProperty({ description: 'Full name of the professional', example: 'John Doe' })
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  fullName: string;

  @ApiProperty({
    description: 'Optional restaurant permit number (will be auto-extracted from image)',
    example: 'N° 12345'
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({
    description: 'Base64 encoded restaurant permit image - "Autorisation d\'exploitation d\'un restaurant" (required for validation)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    required: true
  })
  @IsNotEmpty({ message: 'Restaurant permit image is required' })
  @IsString({ message: 'License image must be a string' })
  licenseImage: string; // Base64 encoded restaurant permit image

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
