import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { FoodType } from '../../posts/schemas/post.schema';

/**
 * Interface for food detection result
 */
export interface HuggingFaceFoodDetectionResult {
  isFood: boolean;
  confidence: number;
  labels: Array<{
    description: string;
    score: number;
  }>;
  detectionMethod: 'huggingface-api' | 'fallback';
}

/**
 * Interface for predicted food category
 */
export interface HuggingFacePredictedCategory {
  category: FoodType;
  confidence: number;
  matchedLabels: string[];
}

/**
 * Interface for category matching result
 */
export interface HuggingFaceCategoryMatchingResult {
  userSelectedCategory: FoodType;
  aiPredictedCategories: HuggingFacePredictedCategory[];
  matchStatus: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';
  suggestedCategory: FoodType | null;
  confidence: number;
  detectionMethod: 'huggingface-api' | 'fallback';
}

/**
 * Service for food detection and category matching using Hugging Face Inference API.
 * Free alternative to Google Cloud Vision API - perfect for Render deployment.
 * 
 * Models used:
 * - Food Detection: google/vit-base-patch16-224 (General image classification)
 * - Category Matching: Maps predictions to FoodType enum
 */
@Injectable()
export class HuggingFaceFoodDetectionService {
  private readonly logger = new Logger(HuggingFaceFoodDetectionService.name);
  private readonly apiToken: string | null = null;
  private readonly apiBaseUrl = 'https://api-inference.huggingface.co/models';
  private readonly useHuggingFace: boolean = false;
  
  // Food detection model - using a more reliable model
  // Alternative models: 'google/vit-base-patch16-224' (general), 'microsoft/resnet-50' (general)
  // For food-specific: 'Kaludi/food-category-classification-v2.0' or use general image classification
  // Try using a model that's more likely to be available
  // Many models require the model to be loaded first, which can cause 410 errors
  // Using a simpler approach: try multiple known-working models
  private readonly FOOD_DETECTION_MODEL = 'facebook/deit-base-distilled-patch16-224';
  private readonly ALTERNATIVE_MODELS = [
    'microsoft/resnet-50',
    'google/vit-base-patch16-224',
    'facebook/deit-base-distilled-patch16-224',
  ];    
  
  // Confidence thresholds
  private readonly FOOD_CONFIDENCE_THRESHOLD = 0.3;
  private readonly MATCH_CONFIDENCE_THRESHOLD = 0.6;
  private readonly UNCERTAIN_THRESHOLD = 0.4;
  private readonly MIN_CATEGORY_SCORE = 0.3;

  // Mapping from Food-101 labels to FoodType enum
  private readonly FOOD_LABEL_TO_TYPE: Map<string, FoodType[]> = new Map([
    // Pizza
    ['pizza', [FoodType.PIZZA]],
    ['pizza_margherita', [FoodType.PIZZA]],
    
    // Burger
    ['hamburger', [FoodType.BURGER]],
    ['cheeseburger', [FoodType.BURGER]],
    ['burger', [FoodType.BURGER]],
    
    // Pasta
    ['spaghetti_bolognese', [FoodType.PASTA]],
    ['spaghetti_carbonara', [FoodType.PASTA]],
    ['lasagna', [FoodType.PASTA]],
    ['macaroni_and_cheese', [FoodType.PASTA]],
    ['pasta', [FoodType.PASTA]],
    
    // Mexican
    ['tacos', [FoodType.MEXICAN]],
    ['burrito', [FoodType.MEXICAN]],
    ['nachos', [FoodType.MEXICAN]],
    ['quesadilla', [FoodType.MEXICAN]],
    
    // Sushi
    ['sushi', [FoodType.SUSHI]],
    ['sashimi', [FoodType.SUSHI]],
    
    // Asian
    ['fried_rice', [FoodType.ASIAN]],
    ['pad_thai', [FoodType.ASIAN]],
    ['ramen', [FoodType.ASIAN]],
    ['pho', [FoodType.ASIAN]],
    ['chicken_curry', [FoodType.ASIAN, FoodType.INDIAN]],
    ['beef_curry', [FoodType.ASIAN, FoodType.INDIAN]],
    
    // Indian
    ['chicken_tikka_masala', [FoodType.INDIAN]],
    ['naan', [FoodType.INDIAN]],
    ['biryani', [FoodType.INDIAN]],
    ['samosa', [FoodType.INDIAN]],
    
    // Middle Eastern
    ['hummus', [FoodType.MIDEAST]],
    ['falafel', [FoodType.MIDEAST]],
    ['kebab', [FoodType.MIDEAST]],
    ['shawarma', [FoodType.MIDEAST]],
    
    // Seafood
    ['fish_and_chips', [FoodType.SEAFOOD]],
    ['grilled_salmon', [FoodType.SEAFOOD]],
    ['lobster_bisque', [FoodType.SEAFOOD]],
    ['crab_cakes', [FoodType.SEAFOOD]],
    
    // Chicken
    ['chicken_wings', [FoodType.CHICKEN]],
    ['fried_chicken', [FoodType.CHICKEN]],
    ['chicken_quesadilla', [FoodType.CHICKEN, FoodType.MEXICAN]],
    
    // Sandwiches
    ['club_sandwich', [FoodType.SANDWICHES]],
    ['grilled_cheese_sandwich', [FoodType.SANDWICHES]],
    
    // Soups
    ['clam_chowder', [FoodType.SOUPS]],
    ['french_onion_soup', [FoodType.SOUPS]],
    ['tomato_soup', [FoodType.SOUPS]],
    
    // Salad
    ['caesar_salad', [FoodType.SALAD]],
    ['caprese_salad', [FoodType.SALAD]],
    ['greek_salad', [FoodType.SALAD]],
    
    // Breakfast
    ['pancakes', [FoodType.BREAKFAST]],
    ['waffles', [FoodType.BREAKFAST]],
    ['french_toast', [FoodType.BREAKFAST]],
    ['eggs_benedict', [FoodType.BREAKFAST]],
    
    // Dessert
    ['apple_pie', [FoodType.DESSERT]],
    ['chocolate_cake', [FoodType.DESSERT]],
    ['ice_cream', [FoodType.DESSERT]],
    ['donuts', [FoodType.DESSERT]],
    ['tiramisu', [FoodType.DESSERT]],
  ]);

  constructor() {
    this.apiToken = process.env.HUGGING_FACE_API_TOKEN || null;
    this.useHuggingFace = !!this.apiToken;

    if (this.useHuggingFace) {
      this.logger.log('✅ Hugging Face Food Detection Service initialized');
      this.logger.log(`   Model: ${this.FOOD_DETECTION_MODEL}`);
    } else {
      this.logger.warn(
        '⚠️ HUGGING_FACE_API_TOKEN not configured. ' +
        'Food detection will use fallback mode. ' +
        'Get token from: https://huggingface.co/settings/tokens'
      );
    }
  }

  /**
   * Detect if an image contains food using Hugging Face Inference API
   */
  async detectFood(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<HuggingFaceFoodDetectionResult> {
    if (!this.useHuggingFace || !this.apiToken) {
      return this.detectFoodFallback();
    }

    try {
      // Convert image to base64 if buffer provided
      let imageBase64: string;
      
      if (imageBuffer) {
        imageBase64 = imageBuffer.toString('base64');
      } else if (imageUrl) {
        // Download image from URL and convert to base64
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });
        imageBase64 = Buffer.from(response.data).toString('base64');
      } else {
        throw new BadRequestException('Either imageBuffer or imageUrl must be provided');
      }

      // Call Hugging Face Inference API
      // Format: Send image as base64 string directly (not wrapped in JSON for some models)
      // Try both formats if one fails
      let apiResponse: any;
      let predictions: any;

      try {
        // Try format 1: Direct base64 string
        apiResponse = await axios.post(
          `${this.apiBaseUrl}/${this.FOOD_DETECTION_MODEL}`,
          imageBase64, // Direct base64 string
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/x-image',
            },
            timeout: 30000,
          }
        );
        predictions = apiResponse.data;
      } catch (error: any) {
        // If format 1 fails, try format 2: JSON with inputs
        if (error.response?.status === 410 || error.response?.status === 404) {
          this.logger.warn(`Model ${this.FOOD_DETECTION_MODEL} not available (410/404). Trying alternative model...`);
          // Try alternative model
          return await this.tryAlternativeModel(imageBase64);
        }
        
        try {
          apiResponse = await axios.post(
            `${this.apiBaseUrl}/${this.FOOD_DETECTION_MODEL}`,
            { inputs: imageBase64 }, // JSON format
            {
              headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );
          predictions = apiResponse.data;
        } catch (error2: any) {
          if (error2.response?.status === 410 || error2.response?.status === 404) {
            this.logger.error(`Model ${this.FOOD_DETECTION_MODEL} is not available (410/404). Using fallback.`);
            return this.detectFoodFallback();
          }
          throw error2;
        }
      }

      // Handle different response formats
      if (!predictions) {
        this.logger.warn('No predictions returned from Hugging Face API');
        return this.detectFoodFallback();
      }

      // Process predictions using shared method
      const result = await this.processPredictions(predictions);
      
      this.logger.debug(
        `Hugging Face food detection: isFood=${result.isFood}, confidence=${result.confidence.toFixed(2)}, labels=${result.labels.length}`
      );

      return result;
    } catch (error: any) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      
      this.logger.error(`Error in Hugging Face food detection: ${error.message} (Status: ${status})`);
      
      // Handle specific errors
      if (status === 410 || status === 404) {
        this.logger.error(`Model ${this.FOOD_DETECTION_MODEL} is not available (${status}). Model may have been removed or endpoint changed.`);
        this.logger.warn('Consider using a different model or enabling Google Cloud Vision API as fallback.');
      } else if (status === 429) {
        this.logger.warn('Hugging Face API rate limit reached. Using fallback mode.');
      } else if (status === 503) {
        this.logger.warn('Hugging Face model is loading. Using fallback mode.');
      } else if (status === 401 || status === 403) {
        this.logger.error('Hugging Face API authentication failed. Check your HUGGING_FACE_API_TOKEN.');
      }
      
      return this.detectFoodFallback();
    }
  }

  /**
   * Try alternative models if primary model fails
   */
  private async tryAlternativeModel(imageBase64: string): Promise<HuggingFaceFoodDetectionResult> {
    // Try each alternative model
    for (const model of this.ALTERNATIVE_MODELS) {
      if (model === this.FOOD_DETECTION_MODEL) continue; // Skip primary model
      
      this.logger.log(`Trying alternative model: ${model}`);
      
      try {
        // Try JSON format first
        const apiResponse = await axios.post(
          `${this.apiBaseUrl}/${model}`,
          { inputs: imageBase64 },
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );
        
        const predictions = apiResponse.data;
        
        // If we got a response, process it
        if (predictions) {
          this.logger.log(`✅ Model ${model} worked! Processing results...`);
          // Process predictions (similar to main method)
          return await this.processPredictions(predictions);
        }
      } catch (error: any) {
        const status = error.response?.status;
        if (status === 410 || status === 404) {
          this.logger.warn(`Model ${model} not available (${status}), trying next...`);
          continue; // Try next model
        } else {
          this.logger.warn(`Model ${model} error: ${error.message}`);
          continue; // Try next model
        }
      }
    }
    
    this.logger.error('All alternative models failed. Using fallback.');
    return this.detectFoodFallback();
  }

  /**
   * Process predictions from API response
   */
  private async processPredictions(predictions: any): Promise<HuggingFaceFoodDetectionResult> {
    // Convert to array if needed
    let predictionsArray: any[] = [];
    if (Array.isArray(predictions)) {
      predictionsArray = predictions;
    } else if (predictions.label && predictions.score) {
      predictionsArray = [predictions];
    } else if (typeof predictions === 'object') {
      predictionsArray = predictions[0] || Object.values(predictions) || [];
    }

    if (predictionsArray.length === 0) {
      return this.detectFoodFallback();
    }

    // Food keywords for detection
    const FOOD_KEYWORDS = [
      'food', 'dish', 'cuisine', 'meal', 'restaurant', 'cooking', 'recipe',
      'pizza', 'burger', 'pasta', 'sushi', 'taco', 'sandwich', 'salad',
      'soup', 'dessert', 'breakfast', 'lunch', 'dinner', 'snack',
      'ingredient', 'vegetable', 'fruit', 'meat', 'seafood', 'chicken',
      'bread', 'rice', 'noodle', 'sauce', 'spice', 'beverage', 'drink',
      'apple', 'banana', 'cake', 'cookie', 'coffee', 'tea', 'juice'
    ];

    const foodLabels = predictionsArray
      .map((pred: any) => {
        const label = (pred.label || pred[0] || '').toLowerCase();
        const score = pred.score || pred[1] || 0;
        return { label, score };
      })
      .filter((pred: any) => {
        const isFoodRelated = FOOD_KEYWORDS.some(keyword => 
          pred.label.includes(keyword.toLowerCase())
        );
        return isFoodRelated || pred.score >= this.FOOD_CONFIDENCE_THRESHOLD;
      })
      .map((pred: any) => ({
        description: pred.label || 'Unknown',
        score: pred.score || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const confidence = foodLabels.length > 0 ? foodLabels[0].score : 0;
    const isFood = foodLabels.length > 0 && confidence >= this.FOOD_CONFIDENCE_THRESHOLD;

    return {
      isFood,
      confidence,
      labels: foodLabels,
      detectionMethod: 'huggingface-api',
    };
  }

  /**
   * Match food category using Hugging Face predictions
   */
  async matchCategory(
    userSelectedCategory: FoodType,
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<HuggingFaceCategoryMatchingResult> {
    if (!this.useHuggingFace || !this.apiToken) {
      return this.matchCategoryFallback(userSelectedCategory);
    }

    try {
      // Get food detection predictions (same API call)
      const detectionResult = await this.detectFood(imageBuffer, imageUrl);
      
      if (detectionResult.detectionMethod === 'fallback') {
        return this.matchCategoryFallback(userSelectedCategory);
      }

      // Map predictions to FoodType categories
      const categoryScores = new Map<FoodType, { score: number; labels: string[] }>();

      detectionResult.labels.forEach(label => {
        const labelKey = label.description.toLowerCase().replace(/\s+/g, '_');
        const score = label.score;

        if (score < this.MIN_CATEGORY_SCORE) {
          return;
        }

        // Check if this label maps to any food type
        this.FOOD_LABEL_TO_TYPE.forEach((foodTypes, mappedLabel) => {
          if (labelKey.includes(mappedLabel) || mappedLabel.includes(labelKey)) {
            foodTypes.forEach(foodType => {
              const existing = categoryScores.get(foodType);
              if (existing) {
                existing.score = Math.max(existing.score, score);
                existing.labels.push(label.description);
              } else {
                categoryScores.set(foodType, {
                  score,
                  labels: [label.description],
                });
              }
            });
          }
        });
      });

      // Convert to array and sort by score
      const predictedCategories: HuggingFacePredictedCategory[] = Array.from(categoryScores.entries())
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
        confidence = userCategoryMatch.confidence;
        if (confidence >= this.MATCH_CONFIDENCE_THRESHOLD) {
          matchStatus = 'MATCH';
        } else if (confidence >= this.UNCERTAIN_THRESHOLD) {
          matchStatus = 'UNCERTAIN';
        } else {
          matchStatus = 'MISMATCH';
          if (predictedCategories.length > 0 && predictedCategories[0].category !== userSelectedCategory) {
            suggestedCategory = predictedCategories[0].category;
          }
        }
      } else {
        if (predictedCategories.length > 0) {
          matchStatus = 'MISMATCH';
          suggestedCategory = predictedCategories[0].category;
          confidence = predictedCategories[0].confidence;
        } else {
          matchStatus = 'UNCERTAIN';
          confidence = 0.3;
        }
      }

      this.logger.debug(
        `Hugging Face category matching: user=${userSelectedCategory}, status=${matchStatus}, confidence=${confidence.toFixed(2)}`
      );

      return {
        userSelectedCategory,
        aiPredictedCategories: predictedCategories,
        matchStatus,
        suggestedCategory,
        confidence,
        detectionMethod: 'huggingface-api',
      };
    } catch (error: any) {
      this.logger.error('Error in Hugging Face category matching:', error.message);
      return this.matchCategoryFallback(userSelectedCategory);
    }
  }

  /**
   * Fallback food detection
   */
  private detectFoodFallback(): HuggingFaceFoodDetectionResult {
    this.logger.warn('Using fallback food detection - accepting all images');
    return {
      isFood: true,
      confidence: 0.5,
      labels: [],
      detectionMethod: 'fallback',
    };
  }

  /**
   * Fallback category matching
   */
  private matchCategoryFallback(userSelectedCategory: FoodType): HuggingFaceCategoryMatchingResult {
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
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    available: boolean;
    tokenConfigured: boolean;
    model: string;
  }> {
    return {
      status: this.useHuggingFace ? 'operational' : 'fallback-mode',
      available: this.useHuggingFace,
      tokenConfigured: !!this.apiToken,
      model: this.FOOD_DETECTION_MODEL,
    };
  }
}

