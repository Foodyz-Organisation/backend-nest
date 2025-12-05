// src/auth/dto/signup.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator'; // <-- Ensure IsString, IsNotEmpty, IsEmail are imported
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty({ description: 'Username of the user', example: 'john_doe' })
    @IsString() // Add validation decorator
    @IsNotEmpty() // Add validation decorator
    username: string;

    @ApiProperty({ description: 'Email address of the user', example: 'john@example.com' })
    @IsEmail() // Add validation decorator
    @IsNotEmpty() // Add validation decorator
    email: string;

    @ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
    @IsString() // Add validation decorator
    @IsNotEmpty() // Add validation decorator
    password: string;

    @ApiPropertyOptional({ description: 'Phone number of the user', example: '+1234567890' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ description: 'Address of the user', example: '123 Main St, City, Country' }) // Removed ApiPropertyOptional
    @IsString() // Add validation decorator
    @IsNotEmpty() // Add validation decorator
    address: string; // Removed '?' to make it required
    // --- END MODIFIED ---

    // Optional fields from UserAccount schema, if you want to allow setting them during signup
    // If these are omitted, the backend's UserAccount schema default values will be used.
    @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional({ description: 'Short biography of the user', example: 'Food enthusiast' })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional({ description: 'URL to the user\'s profile picture', example: 'http://example.com/profile.jpg' })
    @IsOptional()
    @IsString() // or IsUrl if you want to strictly validate URL format
    profilePictureUrl?: string;
}
