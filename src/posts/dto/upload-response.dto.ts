// src/posts/dto/upload-response.dto.ts
import { IsArray, IsUrl, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: 'An array of URLs for the successfully uploaded media files.',
    type: [String],
    example: ['http://localhost:3000/uploads/16788812345-randomhash1.jpg', 'http://localhost:3000/uploads/16788812345-randomhash2.mp4'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'The uploaded file URLs array cannot be empty.' })
  @IsUrl({}, { each: true, message: 'Each URL in the response must be a valid URL.' })
  urls: string[];
}
