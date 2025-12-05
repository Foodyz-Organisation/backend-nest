// src/user/dto/user-profile-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsUrl, IsNumber, IsBoolean } from 'class-validator';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'The unique ID of the user', example: '60c72b2f9b1d8c001c8e4d1a' })
  @IsString()
  @IsNotEmpty()
  _id: string; // Mongoose will convert ObjectId to string

  @ApiProperty({ description: 'Unique username for the user', example: 'mohamedali_foodie' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Full name of the user', example: 'Mohamed Ali' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Short biography of the user', example: 'Food enthusiast 🍕' })
  @IsString()
  bio: string;

  @ApiProperty({ description: 'URL to the user\'s profile picture', example: 'http://example.com/profile.jpg', required: false })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;

  @ApiProperty({ description: 'Number of followers the user has', example: 123 })
  @IsNumber()
  followerCount: number;

  @ApiProperty({ description: 'Number of users this user is following', example: 456 })
  @IsNumber()
  followingCount: number;

  @ApiProperty({ description: 'Total number of posts made by the user', example: 10 })
  @IsNumber()
  postCount: number; // This will be dynamically calculated

  @ApiProperty({ description: 'User phone number', example: '+21620123456', required: false })
  @IsString()
  @IsOptional()
  phone?: string; // Optional for profile response (might not expose to everyone)

  @ApiProperty({ description: 'User address', example: 'Tunis, Tunisia', required: false })
  @IsString()
  @IsOptional()
  address?: string; // Optional for profile response

  @ApiProperty({ description: 'Unique email address for the user', example: 'mohamed.ali@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string; // Optional for profile response

  @ApiProperty({ description: 'Whether the user account is active', example: true })
  @IsBoolean()
  isActive: boolean;
}
