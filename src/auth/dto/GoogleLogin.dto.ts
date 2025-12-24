import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ 
    description: 'Google ID token from the frontend', 
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...' 
  })
  @IsString({ message: 'ID token must be a string' })
  @IsNotEmpty({ message: 'ID token is required' })
  idToken: string;
}

