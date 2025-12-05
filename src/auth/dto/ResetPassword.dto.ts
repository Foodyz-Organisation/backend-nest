import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordWithOtpDto {
  @ApiProperty({ 
    description: 'Email address', 
    example: 'user@example.com' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Reset token received after OTP verification', 
    example: 'abc123token456' 
  })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ 
    description: 'New password (min 8 characters)', 
    example: 'NewP@ss123' 
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  newPassword: string;
}