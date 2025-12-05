// forgot-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ 
    description: 'Email address to send OTP', 
    example: 'user@example.com' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({ 
    description: 'Email address', 
    example: 'user@example.com' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: '6-digit OTP code', 
    example: '123456' 
  })
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  otp: string;
}