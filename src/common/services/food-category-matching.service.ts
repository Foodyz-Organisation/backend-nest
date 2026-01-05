import { Injectable, Logger } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import { FoodType } from '../../posts/schemas/post.schema';
import { ClarifaiFoodDetectionService } from './clarifai-food-detection.service';
import { HuggingFaceFoodDetectionService } from './huggingface-food-detection.service';

/**
 * Interface for predicted food category
 */
export interface PredictedCategory {
  category: FoodType;
  confidence: number;
  matchedLabels: string[];
}

/**
 * Interface for category matching result
 */
export interface CategoryMatchingResult {
  userSelectedCategory: FoodType;
  aiPredictedCategories: PredictedCategory[];
  matchStatus: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';
  suggestedCategory: FoodType | null;
  confidence: number;
  detectionMethod: 'clarifai-api' | 'huggingface-api' | 'vision-api' | 'fallback';
}

/**
 * Service for matching AI-predicted food categories with user-selected categories.
 * Analyzes images to predict food categories and compares them with user selections.
 * 
 * Similar pattern to BadWordsDetectionService and SpamDetectionService.
 */
@Injectable()
export class FoodCategoryMatchingService {
  private readonly logger = new Logger(FoodCategoryMatchingService.name);
  private readonly visionClient: ImageAnnotatorClient | null = null;
  private readonly useVisionAPI: boolean = false;
  private readonly clarifaiService: ClarifaiFoodDetectionService;
  private readonly huggingFaceService: HuggingFaceFoodDetectionService;
  private readonly MATCH_CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for MATCH
  private readonly UNCERTAIN_THRESHOLD = 0.4; // Below this is UNCERTAIN
  private readonly MIN_CATEGORY_SCORE = 0.3; // Minimum score to consider a category

  // Mapping from Vision API labels to FoodType enum
  private readonly LABEL_TO_FOOD_TYPE: Map<string, FoodType[]> = new Map([
    // Pizza
    ['pizza', [FoodType.PIZZA]],
    ['italian cuisine', [FoodType.PIZZA, FoodType.PASTA]],
    
    // Burger
    ['burger', [FoodType.BURGER]],
    ['hamburger', [FoodType.BURGER]],
    ['cheeseburger', [FoodType.BURGER]],
    ['fast food', [FoodType.BURGER, FoodType.SANDWICHES]],
    
    // Pasta
    ['pasta', [FoodType.PASTA]],
    ['spaghetti', [FoodType.PASTA]],
    ['noodle', [FoodType.PASTA, FoodType.ASIAN]],
    ['italian food', [FoodType.PASTA, FoodType.PIZZA]],
    
    // Mexican
    ['taco', [FoodType.MEXICAN]],
    ['burrito', [FoodType.MEXICAN]],
    ['mexican cuisine', [FoodType.MEXICAN]],
    ['quesadilla', [FoodType.MEXICAN]],
    
    // Sushi
    ['sushi', [FoodType.SUSHI]],
    ['japanese cuisine', [FoodType.SUSHI, FoodType.ASIAN]],
    ['sashimi', [FoodType.SUSHI]],
    
    // Asian
    ['chinese cuisine', [FoodType.ASIAN]],
    ['thai cuisine', [FoodType.ASIAN]],
    ['korean cuisine', [FoodType.ASIAN]],
    ['asian cuisine', [FoodType.ASIAN]],
    ['fried rice', [FoodType.ASIAN]],
    ['curry', [FoodType.ASIAN, FoodType.INDIAN]],
    
    // Indian
    ['indian cuisine', [FoodType.INDIAN]],
    ['naan', [FoodType.INDIAN]],
    ['biryani', [FoodType.INDIAN]],
    
    // Middle Eastern
    ['middle eastern cuisine', [FoodType.MIDEAST]],
    ['hummus', [FoodType.MIDEAST]],
    ['falafel', [FoodType.MIDEAST]],
    ['kebab', [FoodType.MIDEAST]],
    ['couscous', [FoodType.MIDEAST]], // Tunisian dish
    ['tajine', [FoodType.MIDEAST]], // Tunisian/Moroccan dish
    
    // Seafood
    ['seafood', [FoodType.SEAFOOD]],
    ['fish', [FoodType.SEAFOOD]],
    ['shrimp', [FoodType.SEAFOOD]],
    ['lobster', [FoodType.SEAFOOD]],
    ['crab', [FoodType.SEAFOOD]],
    
    // Chicken
    ['chicken', [FoodType.CHICKEN]],
    ['fried chicken', [FoodType.CHICKEN]],
    ['roast chicken', [FoodType.CHICKEN]],
    
    // Sandwiches
    ['sandwich', [FoodType.SANDWICHES]],
    ['sub', [FoodType.SANDWICHES]],
    ['wrap', [FoodType.SANDWICHES]],
    
    // Soups
    ['soup', [FoodType.SOUPS]],
    ['stew', [FoodType.SOUPS]],
    ['broth', [FoodType.SOUPS]],
    
    // Salad
    ['salad', [FoodType.SALAD]],
    ['green salad', [FoodType.SALAD]],
    
    // Vegetarian/Vegan
    ['vegetarian', [FoodType.VEGETARIAN]],
    ['vegan', [FoodType.VEGAN]],
    ['plant-based', [FoodType.VEGAN, FoodType.VEGETARIAN]],
    
    // Healthy
    ['healthy food', [FoodType.HEALTHY]],
    ['organic food', [FoodType.HEALTHY]],
    
    // Breakfast
    ['breakfast', [FoodType.BREAKFAST]],
    ['pancake', [FoodType.BREAKFAST]],
    ['waffle', [FoodType.BREAKFAST]],
    ['eggs', [FoodType.BREAKFAST]],
    
    // Dessert
    ['dessert', [FoodType.DESSERT]],
    ['cake', [FoodType.DESSERT]],
    ['ice cream', [FoodType.DESSERT]],
    ['cookie', [FoodType.DESSERT]],
    ['pastry', [FoodType.DESSERT]],
    
    // Drinks
    ['beverage', [FoodType.DRINKS]],
    ['drink', [FoodType.DRINKS]],
    ['coffee', [FoodType.DRINKS]],
    ['juice', [FoodType.DRINKS]],
  ]);

  constructor(
    clarifaiService: ClarifaiFoodDetectionService,
    huggingFaceService: HuggingFaceFoodDetectionService,
  ) {
    this.clarifaiService = clarifaiService;
    this.huggingFaceService = huggingFaceService;
    
    // Check if Google Cloud Vision credentials are configured (fallback option)
    const credentialsPath = process.env.FOOD_DETECTION_CREDENTIALS;
    
    if (credentialsPath) {
      try {
        // Check if file exists
        const fullPath = path.resolve(credentialsPath);
        if (fs.existsSync(fullPath)) {
          this.visionClient = new ImageAnnotatorClient({
            keyFilename: fullPath,
          });
          this.useVisionAPI = true;
          this.logger.log('✅ Google Cloud Vision API available as fallback for category matching');
        } else {
          this.logger.warn(`⚠️ Food detection credentials file not found: ${fullPath}`);
        }
      } catch (error) {
        this.logger.error('❌ Failed to initialize Google Cloud Vision API:', error);
        this.useVisionAPI = false;
      }
    }
  }

  /**
   * Predict food category from an image and compare with user selection.
   * Tries Clarifai first (most reliable free), then Hugging Face, then Google Cloud Vision, then fallback.
   * 
   * @param userSelectedCategory - The food category selected by the user
   * @param imageBuffer - Optional buffer containing the image data
   * @param imageUrl - Optional URL of the image (for remote images)
   * @returns Promise<CategoryMatchingResult> - Matching result with suggestions
   */
  async matchCategory(
    userSelectedCategory: FoodType,
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<CategoryMatchingResult> {
    // Try Clarifai first (most reliable free option)
    try {
      const clarifaiResult = await this.clarifaiService.matchCategory(
        userSelectedCategory,
        imageBuffer,
        imageUrl
      );
      if (clarifaiResult.detectionMethod === 'clarifai-api') {
        return {
          userSelectedCategory: clarifaiResult.userSelectedCategory,
          aiPredictedCategories: clarifaiResult.aiPredictedCategories.map(pred => ({
            category: pred.category,
            confidence: pred.confidence,
            matchedLabels: pred.matchedLabels,
          })),
          matchStatus: clarifaiResult.matchStatus,
          suggestedCategory: clarifaiResult.suggestedCategory,
          confidence: clarifaiResult.confidence,
          detectionMethod: 'clarifai-api',
        };
      }
    } catch (error) {
      this.logger.warn('Clarifai category matching failed, trying Hugging Face...', error);
    }

    // Try Hugging Face second (free, but less reliable)
    try {
      const huggingFaceResult = await this.huggingFaceService.matchCategory(
        userSelectedCategory,
        imageBuffer,
        imageUrl
      );
      if (huggingFaceResult.detectionMethod === 'huggingface-api') {
        return {
          userSelectedCategory: huggingFaceResult.userSelectedCategory,
          aiPredictedCategories: huggingFaceResult.aiPredictedCategories.map(pred => ({
            category: pred.category,
            confidence: pred.confidence,
            matchedLabels: pred.matchedLabels,
          })),
          matchStatus: huggingFaceResult.matchStatus,
          suggestedCategory: huggingFaceResult.suggestedCategory,
          confidence: huggingFaceResult.confidence,
          detectionMethod: 'huggingface-api',
        };
      }
    } catch (error) {
      this.logger.warn('Hugging Face category matching failed, trying Google Cloud Vision...', error);
    }

    // Fallback to Google Cloud Vision if available
    if (this.useVisionAPI && this.visionClient) {
      try {
        return await this.matchCategoryWithVisionAPI(userSelectedCategory, imageBuffer, imageUrl);
      } catch (error) {
        this.logger.error('Error using Vision API for category matching:', error);
        // Continue to final fallback
      }
    }

    // Final fallback mode
    this.logger.warn('Using fallback category matching (no APIs available)');
    return this.matchCategoryFallback(userSelectedCategory);
  }

  /**
   * Match category using Google Cloud Vision API
   */
  private async matchCategoryWithVisionAPI(
    userSelectedCategory: FoodType,
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<CategoryMatchingResult> {
    if (!this.visionClient) {
      throw new Error('Vision API client is not initialized');
    }

    try {
      let request: any;

      if (imageBuffer) {
        request = {
          image: { content: imageBuffer },
        };
      } else if (imageUrl) {
        request = {
          image: { source: { imageUri: imageUrl } },
        };
      } else {
        throw new Error('Either imageBuffer or imageUrl must be provided');
      }

      // Request label detection
      const [result] = await this.visionClient.labelDetection(request);
      const labels = result.labelAnnotations || [];

      // Map labels to food categories
      const categoryScores = new Map<FoodType, { score: number; labels: string[] }>();

      labels.forEach(label => {
        const description = (label.description || '').toLowerCase();
        const score = label.score ?? 0; // Handle null/undefined

        if (score < this.MIN_CATEGORY_SCORE) {
          return; // Skip low-confidence labels
        }

        // Check if this label maps to any food type
        this.LABEL_TO_FOOD_TYPE.forEach((foodTypes, labelKey) => {
          if (description.includes(labelKey.toLowerCase())) {
            foodTypes.forEach(foodType => {
              const existing = categoryScores.get(foodType);
              if (existing) {
                existing.score = Math.max(existing.score, score);
                existing.labels.push(label.description || '');
              } else {
                categoryScores.set(foodType, {
                  score,
                  labels: [label.description || ''],
                });
              }
            });
          }
        });
      });

      // Convert to array and sort by score
      const predictedCategories: PredictedCategory[] = Array.from(categoryScores.entries())
        .map(([category, data]) => ({
          category,
          confidence: data.score,
          matchedLabels: data.labels,
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5); // Top 5 predictions

      // Find if user's category is in predictions
      const userCategoryMatch = predictedCategories.find(
        pred => pred.category === userSelectedCategory
      );

      // Determine match status
      let matchStatus: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';
      let suggestedCategory: FoodType | null = null;
      let confidence = 0;

      if (userCategoryMatch) {
        // User's category was predicted
        confidence = userCategoryMatch.confidence;
        if (confidence >= this.MATCH_CONFIDENCE_THRESHOLD) {
          matchStatus = 'MATCH';
        } else if (confidence >= this.UNCERTAIN_THRESHOLD) {
          matchStatus = 'UNCERTAIN';
        } else {
          matchStatus = 'MISMATCH';
          // Suggest the top prediction if it's different
          if (predictedCategories.length > 0 && predictedCategories[0].category !== userSelectedCategory) {
            suggestedCategory = predictedCategories[0].category;
          }
        }
      } else {
        // User's category was not predicted
        if (predictedCategories.length > 0) {
          matchStatus = 'MISMATCH';
          suggestedCategory = predictedCategories[0].category;
          confidence = predictedCategories[0].confidence;
        } else {
          // No predictions at all
          matchStatus = 'UNCERTAIN';
          confidence = 0.3; // Low confidence
        }
      }

      this.logger.debug(
        `Category matching: user=${userSelectedCategory}, status=${matchStatus}, confidence=${confidence.toFixed(2)}`
      );

      return {
        userSelectedCategory,
        aiPredictedCategories: predictedCategories,
        matchStatus,
        suggestedCategory,
        confidence,
        detectionMethod: 'vision-api',
      };
    } catch (error: any) {
      this.logger.error('Error in Vision API category matching:', error);
      
      // Check if it's a billing error
      if (error?.code === 7 || error?.message?.includes('billing')) {
        this.logger.error(
          '⚠️ BILLING NOT ENABLED: Google Cloud Vision API requires billing to be enabled. ' +
          'Even with free tier, billing must be enabled. ' +
          'Visit: https://console.developers.google.com/billing/enable?project=YOUR_PROJECT_ID'
        );
        // Fall back gracefully instead of throwing
        return this.matchCategoryFallback(userSelectedCategory);
      }
      
      // For other errors, throw
      throw new Error(`Category matching failed: ${error.message}`);
    }
  }

  /**
   * Fallback category matching (accepts user selection)
   */
  private matchCategoryFallback(userSelectedCategory: FoodType): CategoryMatchingResult {
    this.logger.warn('Using fallback category matching - accepting user selection');
    
    return {
      userSelectedCategory,
      aiPredictedCategories: [],
      matchStatus: 'UNCERTAIN',
      suggestedCategory: null,
      confidence: 0.5,
      detectionMethod: 'fallback',
    };
  }

  /**
   * Check if Vision API is available
   */
  isApiAvailable(): boolean {
    return this.useVisionAPI && this.visionClient !== null;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: string;
    available: boolean;
    credentialsConfigured: boolean;
  }> {
    return {
      status: this.useVisionAPI ? 'operational' : 'fallback-mode',
      available: this.isApiAvailable(),
      credentialsConfigured: !!process.env.FOOD_DETECTION_CREDENTIALS,
    };
  }
}

