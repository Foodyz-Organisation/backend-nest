import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { FoodType } from '../schemas/post.schema';

export class UpdatePostDto {
  @ApiProperty({
    description: 'The updated caption for the post',
    required: false, // The field itself is optional in the request body for PATCH
    example: 'A truly magnificent sunset!',
  })
  @IsOptional() // The client doesn't have to send a caption to update
  @IsString({ message: 'Caption must be a string.' })
  @IsNotEmpty({ message: 'Caption cannot be an empty string if provided.' }) // If provided, it must not be empty
  caption?: string; // It's optional here because not every PATCH request will update the caption

  @ApiProperty({
    description: 'The updated food type for the post',
    required: false,
    enum: FoodType,
    example: FoodType.BURGER,
  })
  @IsOptional()
  @IsEnum(FoodType, {
    message: `Food type must be one of: ${Object.values(FoodType).join(', ')}`,
  })
  foodType?: FoodType; // Optional - allows updating food category
}
