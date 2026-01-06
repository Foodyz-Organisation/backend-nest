// src/auth/dto/signup.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, IsUrl, Matches, IsStrongPassword } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty({ description: 'Username of the user', example: 'john_doe' })
    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    username: string;

    @ApiProperty({ description: 'Email address of the user', example: 'john@example.com' })
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

    @ApiPropertyOptional({ description: 'Phone number of the user (Tunisian format)', example: '+21612345678' })
    @IsOptional()
    @IsString({ message: 'Phone number must be a string' })
    @Matches(/^\+216\d{8}$/, { message: 'Phone number must be in Tunisian format: +216 followed by 8 digits' })
    phone?: string;

    @ApiProperty({ description: 'Address of the user', example: '123 Main St, City, Country' })
    @IsString({ message: 'Address must be a string' })
    @IsNotEmpty({ message: 'Address is required' })
    @MinLength(5, { message: 'Address must be at least 5 characters long' })
    address: string;

    // Optional fields from UserAccount schema, if you want to allow setting them during signup
    // If these are omitted, the backend's UserAccount schema default values will be used.
    @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
    @IsOptional()
    @IsString({ message: 'Full name must be a string' })
    @MinLength(2, { message: 'Full name must be at least 2 characters long' })
    fullName?: string;

    @ApiPropertyOptional({ description: 'Short biography of the user', example: 'Food enthusiast' })
    @IsOptional()
    @IsString({ message: 'Bio must be a string' })
    bio?: string;

    @ApiPropertyOptional({ description: 'URL to the user\'s profile picture', example: 'http://example.com/profile.jpg' })
    @IsOptional()
    @IsUrl({}, { message: 'Profile picture must be a valid URL' })
    profilePictureUrl?: string;
}
