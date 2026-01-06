import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MealScannerService } from './meal-scanner.service';
import { AnalyzeMealDto, RecipeSuggestionsDto, ExercisePlanDto } from './dto/meal-scanner.dto';

@Controller('meal-scanner')
export class MealScannerController {
  constructor(private readonly mealScannerService: MealScannerService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('image'))
  async analyzeMeal(
    @UploadedFile() image: Express.Multer.File,
    @Body() dto: AnalyzeMealDto,
  ) {
    if (!image) {
      throw new BadRequestException('Image is required');
    }

    const result = await this.mealScannerService.analyzeMeal(
      dto.mealDescription,
      image.buffer,
      dto.age,
      dto.condition,
      dto.goal,
    );

    return {
      success: true,
      analysis: result,
    };
  }

  @Post('recipes')
  async getRecipes(@Body() dto: RecipeSuggestionsDto) {
    const result = await this.mealScannerService.getRecipeSuggestions(
      dto.ingredients,
      dto.condition || 'none',
      dto.age || 30,
    );

    return {
      success: true,
      recipes: result,
    };
  }

  @Post('exercise')
  async generateExercise(@Body() dto: ExercisePlanDto) {
    const result = await this.mealScannerService.generateExercisePlan(
      dto.age,
      dto.goal,
      dto.condition,
    );

    return {
      success: true,
      plan: result,
    };
  }
}
