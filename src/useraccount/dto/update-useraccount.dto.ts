// src/user/dto/update-user.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean, IsUrl } from 'class-validator'; // <-- Add IsUrl
import { ApiProperty, PartialType } from '@nestjs/swagger'; // <-- Add PartialType
import { CreateUserDto } from './create-useraccount.dto';

// PartialType makes all fields of CreateUserDto optional
// This is a common and clean way to create update DTOs in NestJS
export class UpdateUserDto extends PartialType(CreateUserDto) {
  // We'll explicitly re-define fields that are not covered by PartialType,
  // or that might have different update-specific validation/Swagger notes.

  @ApiProperty({ description: 'User phone number', example: '+21620123456', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Phone number cannot be an empty string if provided.' })
  phone?: string;

  @ApiProperty({ description: 'User address', example: 'Tunis, Tunisia', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Address cannot be an empty string if provided.' })
  address?: string;

  @ApiProperty({ description: 'User password', example: 'newstrongpassword123', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Password cannot be an empty string if provided.' })
  password?: string;

  @ApiProperty({ description: 'Is the user account active?', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // The new fields (fullName, bio, profilePictureUrl) are already covered as optional by PartialType(CreateUserDto)
  // We can re-declare them here with @IsOptional() and @IsNotEmpty() if we want specific empty string checks,
  // but PartialType already makes them optional. If you want to allow clearing them by sending empty string,
  // remove @IsNotEmpty() from them in CreateUserDto. For now, assuming empty string is not valid.
}
