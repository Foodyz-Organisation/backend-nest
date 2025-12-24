// src/posts/dto/create-post.dto.ts
import {
  IsString,
  IsArray,
  ArrayMinSize,
  IsUrl,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  // Removed IsOptional as caption is now required
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MediaType, FoodType } from '../schemas/post.schema'; // Import MediaType and FoodType enums

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

  @ApiProperty({
    description: 'The type of food in the post. Must be one of the predefined food types.',
    enum: FoodType,
    example: FoodType.BURGER,
  })
  @IsEnum(FoodType, { 
    message: 'Food type must be one of: BURGER, PIZZA, PASTA, MEXICAN, SUSHI, ASIAN, INDIAN, MIDEAST, SEAFOOD, CHICKEN, SANDWICHES, SOUPS, SALAD, VEGETARIAN, VEGAN, HEALTHY, GLUTEN_FREE, SPICY, BREAKFAST, DESSERT, DRINKS, KIDS_MENU, FAMILY_MEAL.' 
  })
  foodType: FoodType;

  @ApiProperty({
    description: 'The price of the food item in TND. Optional field. Will be displayed as "30TND" or "6.9TND" on the frontend.',
    type: Number,
    required: false,
    example: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0, { message: 'Price must be a positive number.' })
  price?: number;

  @ApiProperty({
    description: 'The preparation time in minutes. Optional field. Will be displayed as "15 minutes" on the frontend.',
    type: Number,
    required: false,
    example: 15,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Preparation time must be a number.' })
  @Min(0, { message: 'Preparation time must be a positive number.' })
  preparationTime?: number;
}
