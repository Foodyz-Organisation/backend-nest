import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNotEmpty, IsMongoId, IsArray } from 'class-validator';

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
}
