// src/posts/dto/create-post.dto.ts
import {
  IsString,
  IsArray,
  ArrayMinSize,
  IsUrl,
  IsEnum,
  // Removed IsOptional as caption is now required
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from '../schemas/post.schema'; // Import MediaType enum

export class CreatePostDto {
  @ApiProperty({
    description: 'The caption for the post',
    required: true, // Now required
    example: 'Beautiful sunset!',
  })
  // --- CHANGE 2: caption is now REQUIRED ---
  @IsString({ message: 'Caption must be a string.' })
  caption: string; // No longer optional

  @ApiProperty({
    description: 'An array of URLs for the media content (images/videos). Must contain at least one URL.',
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.png'],
  })
  @IsArray({ message: 'Media URLs must be an array.' })
  @ArrayMinSize(1, { message: 'At least one media URL is required.' })
  @IsUrl(
    {},
    { each: true, message: 'Each media URL must be a valid URL format.' },
  )
  mediaUrls: string[];

  @ApiProperty({
    description: 'The type of media content. Can be "image", "reel", or "carousel". Determined by the client.',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType, { message: 'Media type must be one of: image, reel, carousel.' })
  mediaType: MediaType;
}
