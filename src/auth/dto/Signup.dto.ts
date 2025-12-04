import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
@ApiProperty({ description: 'Username of the user', example: 'john_doe' })
username: string;

@ApiProperty({ description: 'Email address of the user', example: 'john@example.com' })
email: string;

@ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
password: string;

@ApiPropertyOptional({ description: 'Phone number of the user', example: '+1234567890' })
phone?: string;

@ApiPropertyOptional({ description: 'Address of the user', example: '123 Main St, City, Country' })
address?: string;

@ApiPropertyOptional({ description: 'Avatar image URL or data URI', example: 'https://cdn.example.com/avatar.png' })
avatarUrl?: string;
}
