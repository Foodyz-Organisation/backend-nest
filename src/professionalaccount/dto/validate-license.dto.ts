import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateLicenseDto {
  @ApiProperty({ 
    description: 'Base64 encoded restaurant permit image (Autorisation d\'exploitation d\'un restaurant)', 
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
  })
  @IsString()
  @IsNotEmpty()
  licenseImage: string; // Restaurant permit image
}

