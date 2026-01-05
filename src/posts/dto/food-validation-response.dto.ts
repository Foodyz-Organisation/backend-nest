import { ApiProperty } from '@nestjs/swagger';
import { FoodType } from '../schemas/post.schema';

/**
 * DTO for food detection result (Part 1)
 */
export class FoodDetectionResultDto {
  @ApiProperty({
    description: 'Whether the image contains food-related content',
    example: true,
  })
  isFood: boolean;

  @ApiProperty({
    description: 'Confidence score (0-1) that the image contains food',
    example: 0.92,
  })
  confidence: number;

  @ApiProperty({
    description: 'Detected food-related labels from the image',
    type: [Object],
    example: [
      { description: 'Food', score: 0.95 },
      { description: 'Pizza', score: 0.88 },
    ],
  })
  labels: Array<{
    description: string;
    score: number;
  }>;

  @ApiProperty({
    description: 'Detection method used',
    enum: ['vision-api', 'fallback'],
    example: 'vision-api',
  })
  detectionMethod: 'vision-api' | 'fallback';
}

/**
 * DTO for predicted food category
 */
export class PredictedCategoryDto {
  @ApiProperty({
    description: 'Predicted food category',
    enum: FoodType,
    example: FoodType.PIZZA,
  })
  category: FoodType;

  @ApiProperty({
    description: 'Confidence score (0-1) for this prediction',
    example: 0.92,
  })
  confidence: number;

  @ApiProperty({
    description: 'Labels that matched this category',
    type: [String],
    example: ['Pizza', 'Italian cuisine'],
  })
  matchedLabels: string[];
}

/**
 * DTO for category matching result (Part 2)
 */
export class CategoryMatchingResultDto {
  @ApiProperty({
    description: 'The food category selected by the user',
    enum: FoodType,
    example: FoodType.PIZZA,
  })
  userSelectedCategory: FoodType;

  @ApiProperty({
    description: 'AI-predicted food categories (top 5)',
    type: [PredictedCategoryDto],
  })
  aiPredictedCategories: PredictedCategoryDto[];

  @ApiProperty({
    description: 'Match status between user selection and AI prediction',
    enum: ['MATCH', 'MISMATCH', 'UNCERTAIN'],
    example: 'MATCH',
  })
  matchStatus: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';

  @ApiProperty({
    description: 'Suggested category if mismatch detected (null if match)',
    enum: FoodType,
    required: false,
    nullable: true,
    example: FoodType.BURGER,
  })
  suggestedCategory: FoodType | null;

  @ApiProperty({
    description: 'Overall confidence score (0-1)',
    example: 0.92,
  })
  confidence: number;

  @ApiProperty({
    description: 'Detection method used',
    enum: ['vision-api', 'fallback'],
    example: 'vision-api',
  })
  detectionMethod: 'vision-api' | 'fallback';
}

/**
 * DTO for complete food validation response (Part 1 + Part 2)
 */
export class FoodValidationResponseDto {
  @ApiProperty({
    description: 'Food detection result (Part 1: Is it food?)',
    type: FoodDetectionResultDto,
  })
  foodDetection: FoodDetectionResultDto;

  @ApiProperty({
    description: 'Category matching result (Part 2: Category validation)',
    type: CategoryMatchingResultDto,
  })
  categoryMatching: CategoryMatchingResultDto;
}

