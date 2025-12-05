import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ description: 'Username of the user', example: 'john_doe' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Email address of the user', example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password for the account', example: 'StrongP@ss123' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Phone number of the user', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address of the user', example: '123 Main St, City, Country' })
  @IsOptional()
  @IsString()
  address?: string;
}
