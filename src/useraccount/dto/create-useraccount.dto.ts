// src/user/dto/create-user.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsUrl } from 'class-validator'; // <-- Add IsOptional, IsUrl
import { ApiProperty } from '@nestjs/swagger'; // <-- Add ApiProperty

export class CreateUserDto {
  @ApiProperty({ description: 'Unique username for the user', example: 'mohamedali_foodie' })
  @IsString()
  @IsNotEmpty()
  username: string;

  // --- NEW FIELDS ---
  @ApiProperty({ description: 'Full name of the user', example: 'Mohamed Ali', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'Short biography of the user', example: 'Food enthusiast 🍕', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: 'URL to the user\'s profile picture', example: 'http://example.com/profile.jpg', required: false })
  @IsOptional()
  @IsUrl({}, { message: 'Profile picture URL must be a valid URL.' }) // Validate if provided
  profilePictureUrl?: string;
  // --- END NEW FIELDS ---

  @ApiProperty({ description: 'User phone number', example: '+21620123456' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'User address', example: 'Tunis, Tunisia' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Unique email address for the user', example: 'mohamed.ali@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'strongpassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
