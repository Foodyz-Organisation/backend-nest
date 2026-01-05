import { Module, Global } from '@nestjs/common';
import { SupabaseStorageService } from './services/supabase-storage.service';
import { FoodDetectionService } from './services/food-detection.service';
import { FoodCategoryMatchingService } from './services/food-category-matching.service';
import { ClarifaiFoodDetectionService } from './services/clarifai-food-detection.service';
import { HuggingFaceFoodDetectionService } from './services/huggingface-food-detection.service';

@Global()
@Module({
  providers: [
    SupabaseStorageService,
    ClarifaiFoodDetectionService, // Must be before FoodDetectionService (dependency)
    HuggingFaceFoodDetectionService, // Must be before FoodDetectionService (dependency)
    FoodDetectionService,
    FoodCategoryMatchingService,
  ],
  exports: [
    SupabaseStorageService,
    FoodDetectionService,
    FoodCategoryMatchingService,
    ClarifaiFoodDetectionService,
    HuggingFaceFoodDetectionService,
  ],
})
export class CommonModule {}









