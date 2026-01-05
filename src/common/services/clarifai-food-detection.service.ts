import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { FoodType } from '../../posts/schemas/post.schema';

/**
 * Interface for food detection result
 */
export interface ClarifaiFoodDetectionResult {
  isFood: boolean;
  confidence: number;
  labels: Array<{
    description: string;
    score: number;
  }>;
  detectionMethod: 'clarifai-api' | 'fallback';
}

/**
 * Interface for predicted food category
 */
export interface ClarifaiPredictedCategory {
  category: FoodType;
  confidence: number;
  matchedLabels: string[];
}

/**
 * Interface for category matching result
 */
export interface ClarifaiCategoryMatchingResult {
  userSelectedCategory: FoodType;
  aiPredictedCategories: ClarifaiPredictedCategory[];
  matchStatus: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';
  suggestedCategory: FoodType | null;
  confidence: number;
  detectionMethod: 'clarifai-api' | 'fallback';
}

/**
 * Service for food detection and category matching using Clarifai API.
 * More reliable than Hugging Face Inference API - perfect for Render deployment.
 * 
 * Free tier: 1,000 requests/month (no credit card required)
 */
@Injectable()
export class ClarifaiFoodDetectionService {
  private readonly logger = new Logger(ClarifaiFoodDetectionService.name);
  private readonly apiKey: string | null = null;
  private readonly apiBaseUrl = 'https://api.clarifai.com/v2';
  private readonly useClarifai: boolean = false;
  
  // Clarifai uses user/app structure - for public models, use 'clarifai' as user
  private readonly CLARIFAI_USER_ID = 'clarifai'; // Public models are under 'clarifai' user
  private readonly CLARIFAI_APP_ID = 'main'; // Default app for public models
  
  // Clarifai Food Model ID (Food-101) - public model
  private readonly FOOD_MODEL_ID = 'bd367be194cf45149e75f01d59f77ba7';
  private readonly GENERAL_MODEL_ID = 'general-image-recognition';
  
  // Confidence thresholds
  private readonly FOOD_CONFIDENCE_THRESHOLD = 0.5; // Increased - need higher confidence to be considered food
  private readonly TOP_PREDICTION_THRESHOLD = 0.7; // Top prediction must be this high to be considered food
  private readonly MIN_FOOD_LABELS = 2; // Need at least 2 food-related labels
  private readonly MATCH_CONFIDENCE_THRESHOLD = 0.6;
  private readonly UNCERTAIN_THRESHOLD = 0.4;
  private readonly MIN_CATEGORY_SCORE = 0.3;

  // Mapping from Clarifai food labels to FoodType enum
  private readonly FOOD_LABEL_TO_TYPE: Map<string, FoodType[]> = new Map([
    // Pizza
    ['pizza', [FoodType.PIZZA]],
    ['pizza margherita', [FoodType.PIZZA]],
    
    // Burger
    ['hamburger', [FoodType.BURGER]],
    ['cheeseburger', [FoodType.BURGER]],
    ['burger', [FoodType.BURGER]],
    
    // Pasta
    ['spaghetti', [FoodType.PASTA]],
    ['spaghetti bolognese', [FoodType.PASTA]],
    ['spaghetti carbonara', [FoodType.PASTA]],
    ['lasagna', [FoodType.PASTA]],
    ['macaroni and cheese', [FoodType.PASTA]],
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
    ['fried rice', [FoodType.ASIAN]],
    ['pad thai', [FoodType.ASIAN]],
    ['ramen', [FoodType.ASIAN]],
    ['pho', [FoodType.ASIAN]],
    ['chicken curry', [FoodType.ASIAN, FoodType.INDIAN]],
    ['beef curry', [FoodType.ASIAN, FoodType.INDIAN]],
    
    // Indian
    ['chicken tikka masala', [FoodType.INDIAN]],
    ['naan', [FoodType.INDIAN]],
    ['biryani', [FoodType.INDIAN]],
    ['samosa', [FoodType.INDIAN]],
    
    // Middle Eastern
    ['hummus', [FoodType.MIDEAST]],
    ['falafel', [FoodType.MIDEAST]],
    ['kebab', [FoodType.MIDEAST]],
    ['shawarma', [FoodType.MIDEAST]],
    
    // Seafood
    ['fish and chips', [FoodType.SEAFOOD]],
    ['grilled salmon', [FoodType.SEAFOOD]],
    ['lobster', [FoodType.SEAFOOD]],
    ['crab', [FoodType.SEAFOOD]],
    
    // Chicken
    ['chicken wings', [FoodType.CHICKEN]],
    ['fried chicken', [FoodType.CHICKEN]],
    ['roast chicken', [FoodType.CHICKEN]],
    
    // Sandwiches
    ['club sandwich', [FoodType.SANDWICHES]],
    ['grilled cheese sandwich', [FoodType.SANDWICHES]],
    
    // Soups
    ['clam chowder', [FoodType.SOUPS]],
    ['french onion soup', [FoodType.SOUPS]],
    ['tomato soup', [FoodType.SOUPS]],
    
    // Salad
    ['caesar salad', [FoodType.SALAD]],
    ['caprese salad', [FoodType.SALAD]],
    ['greek salad', [FoodType.SALAD]],
    
    // Breakfast
    ['pancakes', [FoodType.BREAKFAST]],
    ['waffles', [FoodType.BREAKFAST]],
    ['french toast', [FoodType.BREAKFAST]],
    ['eggs benedict', [FoodType.BREAKFAST]],
    
    // Dessert
    ['apple pie', [FoodType.DESSERT]],
    ['chocolate cake', [FoodType.DESSERT]],
    ['ice cream', [FoodType.DESSERT]],
    ['donuts', [FoodType.DESSERT]],
    ['tiramisu', [FoodType.DESSERT]],
  ]);

  // Food-related keywords for general model
  // Note: We exclude generic words like "water", "grass", "wheat" that can appear in non-food contexts
  private readonly FOOD_KEYWORDS = [
    'food', 'dish', 'cuisine', 'meal', 'restaurant', 'cooking', 'recipe',
    'pizza', 'burger', 'pasta', 'sushi', 'taco', 'sandwich', 'salad',
    'soup', 'dessert', 'breakfast', 'lunch', 'dinner', 'snack',
    'ingredient', 'vegetable', 'fruit', 'meat', 'seafood', 'chicken',
    'bread', 'rice', 'noodle', 'sauce', 'spice', 'beverage',
    // Specific food items (exclude generic words that appear in non-food contexts)
    'cake', 'cookie', 'pie', 'steak', 'fish', 'shrimp', 'lobster', 'crab',
    'apple', 'banana', 'orange', 'tomato', 'potato', 'onion', 'garlic',
    'cheese', 'milk', 'yogurt', 'butter', 'egg', 'bacon', 'sausage',
  ];
  
  // Non-food keywords that should exclude an image from being considered food
  private readonly NON_FOOD_KEYWORDS = [
    'car', 'vehicle', 'automobile', 'truck', 'bus', 'motorcycle',
    'person', 'people', 'human', 'face', 'portrait',
    'building', 'house', 'architecture', 'street', 'road',
    'animal', 'dog', 'cat', 'bird', 'wildlife',
    'nature', 'landscape', 'mountain', 'ocean', 'beach',
    'furniture', 'chair', 'table', 'bed',
    'electronics', 'computer', 'phone', 'television',
  ];

  constructor() {
    this.apiKey = process.env.CLARIFAI_API_KEY || null;
    this.useClarifai = !!this.apiKey;

    if (this.useClarifai && this.apiKey) {
      this.logger.log('✅ Clarifai Food Detection Service initialized');
      this.logger.log(`   Food Model: ${this.FOOD_MODEL_ID}`);
      this.logger.log(`   API Key: ${this.apiKey.substring(0, 10)}... (first 10 chars)`);
    } else {
      this.logger.warn(
        '⚠️ CLARIFAI_API_KEY not configured. ' +
        'Food detection will use fallback mode. ' +
        'Get API key from: https://portal.clarifai.com/settings/profile'
      );
    }
  }

  /**
   * Detect if an image contains food using Clarifai API
   */
  async detectFood(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<ClarifaiFoodDetectionResult> {
    if (!this.useClarifai || !this.apiKey) {
      return this.detectFoodFallback();
    }

    try {
      // Prepare image data
      let imageData: string;
      
      if (imageBuffer) {
        imageData = imageBuffer.toString('base64');
      } else if (imageUrl) {
        // For URLs, use the URL directly (Clarifai supports URLs)
        imageData = imageUrl;
      } else {
        throw new BadRequestException('Either imageBuffer or imageUrl must be provided');
      }

      // Use General Model first - it's better at distinguishing food vs non-food
      // Food Model classifies ANY image into food categories, even non-food images
      // So we use General Model to detect if it's food, then Food Model for classification
      let predictions: any[] = [];
      const isUrl = !!imageUrl; // Determine if we're using URL or base64
      
      try {
        // Use general model - better at detecting if something IS food
        const generalResponse = await this.callClarifaiAPI(this.GENERAL_MODEL_ID, imageData, isUrl);
        predictions = generalResponse;
      } catch (error: any) {
        this.logger.warn('General model failed, trying food model...', error.message);
        // Fallback to food model
        const foodResponse = await this.callClarifaiAPI(this.FOOD_MODEL_ID, imageData, isUrl);
        predictions = foodResponse;
      }

      if (!predictions || predictions.length === 0) {
        this.logger.warn('No predictions returned from Clarifai API');
        return this.detectFoodFallback();
      }

      // Process predictions - be more strict about what counts as food
      const allLabels = predictions
        .map((pred: any) => ({
          description: pred.name || 'Unknown',
          score: pred.value || 0,
        }))
        .sort((a, b) => b.score - a.score);

      // Filter for food-related labels only
      const foodLabels = allLabels.filter((label) => {
        const name = label.description.toLowerCase();
        
        // Check if label name contains food keywords
        const isFoodRelated = this.FOOD_KEYWORDS.some(keyword => 
          name.includes(keyword.toLowerCase())
        );
        
        return isFoodRelated && label.score >= this.FOOD_CONFIDENCE_THRESHOLD;
      });

      // Check for non-food keywords first (strong signal that it's NOT food)
      const topLabel = allLabels[0];
      const hasNonFoodKeyword = topLabel && this.NON_FOOD_KEYWORDS.some(keyword => 
        topLabel.description.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // If top label is clearly non-food, reject immediately
      if (hasNonFoodKeyword && topLabel.score >= 0.5) {
        this.logger.debug(
          `Not food: topLabel="${topLabel.description}" (${topLabel.score.toFixed(2)}) is non-food keyword`
        );
        return {
          isFood: false,
          confidence: 1 - topLabel.score, // Invert confidence (low = not food)
          labels: foodLabels.slice(0, 5),
          detectionMethod: 'clarifai-api',
        };
      }
      
      // Determine if image contains food
      // Criteria (STRICT):
      // 1. Top prediction MUST be food-related AND have high confidence (>= 0.7)
      // 2. OR at least 2 food-related labels with decent confidence (>= 0.5)
      // This prevents false positives from non-food images
      const topLabelIsFood = topLabel && this.FOOD_KEYWORDS.some(keyword => 
        topLabel.description.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Require top prediction to be food-related with high confidence
      const hasStrongFoodSignal = topLabelIsFood && topLabel.score >= this.TOP_PREDICTION_THRESHOLD;
      
      // OR require multiple food labels with decent confidence
      const hasMultipleFoodLabels = foodLabels.length >= this.MIN_FOOD_LABELS;
      const avgFoodConfidence = foodLabels.length > 0 
        ? foodLabels.reduce((sum, label) => sum + label.score, 0) / foodLabels.length 
        : 0;
      const hasGoodFoodLabels = hasMultipleFoodLabels && avgFoodConfidence >= this.FOOD_CONFIDENCE_THRESHOLD;
      
      const confidence = foodLabels.length > 0 ? foodLabels[0].score : (topLabel?.score || 0);
      const isFood = hasStrongFoodSignal || hasGoodFoodLabels;
      
      // Log for debugging
      if (!isFood && topLabel) {
        this.logger.debug(
          `Not food: topLabel="${topLabel.description}" (${topLabel.score.toFixed(2)}), ` +
          `isFood=${topLabelIsFood}, foodLabels=${foodLabels.length}, ` +
          `hasStrongSignal=${hasStrongFoodSignal}, hasGoodLabels=${hasGoodFoodLabels}`
        );
      }

      this.logger.debug(
        `Clarifai food detection: isFood=${isFood}, confidence=${confidence.toFixed(2)}, labels=${foodLabels.length}`
      );

      return {
        isFood,
        confidence,
        labels: foodLabels,
        detectionMethod: 'clarifai-api',
      };
    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      this.logger.error(`Error in Clarifai food detection: ${error.message} (Status: ${status})`);
      
      if (status === 401 || status === 403) {
        this.logger.error('❌ Clarifai API authentication failed.');
        this.logger.error('   Possible causes:');
        this.logger.error('   1. CLARIFAI_API_KEY not set in .env file');
        this.logger.error('   2. API key is incorrect or invalid');
        this.logger.error('   3. API key format is wrong');
        this.logger.error(`   Current API key (first 10 chars): ${this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
        this.logger.error('   Get your API key from: https://portal.clarifai.com/settings/profile');
        if (errorData) {
          this.logger.error(`   API Error Details: ${JSON.stringify(errorData)}`);
        }
      } else if (status === 429) {
        this.logger.warn('Clarifai API rate limit reached. Using fallback mode.');
      } else if (status === 400) {
        this.logger.error('Clarifai API bad request. Check request format.');
        if (errorData) {
          this.logger.error(`   API Error Details: ${JSON.stringify(errorData)}`);
        }
      }
      
      return this.detectFoodFallback();
    }
  }

  /**
   * Call Clarifai API
   */
  private async callClarifaiAPI(
    modelId: string,
    imageData: string,
    isUrl: boolean = false,
  ): Promise<any[]> {
    // Clarifai API format
    const requestBody: any = {
      inputs: [
        {
          data: {
            image: isUrl 
              ? { url: imageData }  // For URLs
              : { base64: imageData }, // For base64
          },
        },
      ],
    };

    // Clarifai API requires user_id and app_id in the URL path
    // Format: /v2/users/{user_id}/apps/{app_id}/models/{model_id}/outputs
    // For public models, use 'clarifai' as user_id and 'main' as app_id
    const apiUrl = `${this.apiBaseUrl}/users/${this.CLARIFAI_USER_ID}/apps/${this.CLARIFAI_APP_ID}/models/${modelId}/outputs`;

    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    // Extract predictions from Clarifai response
    const outputs = response.data?.outputs || [];
    if (outputs.length === 0) {
      return [];
    }

    const concepts = outputs[0]?.data?.concepts || [];
    return concepts.map((concept: any) => ({
      name: concept.name,
      value: concept.value,
    }));
  }

  /**
   * Match food category using Clarifai predictions
   */
  async matchCategory(
    userSelectedCategory: FoodType,
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<ClarifaiCategoryMatchingResult> {
    if (!this.useClarifai || !this.apiKey) {
      return this.matchCategoryFallback(userSelectedCategory);
    }

    try {
      // Get food detection predictions
      const detectionResult = await this.detectFood(imageBuffer, imageUrl);
      
      if (detectionResult.detectionMethod === 'fallback') {
        return this.matchCategoryFallback(userSelectedCategory);
      }

      // Map predictions to FoodType categories
      const categoryScores = new Map<FoodType, { score: number; labels: string[] }>();

      detectionResult.labels.forEach(label => {
        const labelKey = label.description.toLowerCase();
        const score = label.score;

        if (score < this.MIN_CATEGORY_SCORE) {
          return;
        }

        // Check if this label maps to any food type
        this.FOOD_LABEL_TO_TYPE.forEach((foodTypes, mappedLabel) => {
          if (labelKey.includes(mappedLabel.toLowerCase()) || mappedLabel.toLowerCase().includes(labelKey)) {
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

      // Convert to array and calculate weighted scores
      // Weight = confidence * (1 + labelCount * 0.1) - prioritize categories with more matched labels
      const predictedCategories: ClarifaiPredictedCategory[] = Array.from(categoryScores.entries())
        .map(([category, data]) => {
          const labelCount = data.labels.length;
          // Weight: confidence + bonus for having more matched labels
          // This helps prioritize specific matches (e.g., "burger" x4) over generic ones (e.g., "tomato", "onion")
          // Bonus of 0.1 per label: BURGER (4 labels) gets +0.4, SOUPS (2 labels) gets +0.2
          // This ensures categories with more specific matches rank higher
          const weightedScore = data.score + (labelCount * 0.1);
          
          return {
            category,
            confidence: data.score,
            matchedLabels: data.labels,
            weightedScore, // Internal score for sorting
          };
        })
        .sort((a, b) => (b as any).weightedScore - (a as any).weightedScore)
        .map(({ weightedScore, ...rest }) => rest) // Remove weightedScore from final result
        .slice(0, 5);

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
        // Check if user's category is in top 2 predictions (more lenient)
        const userCategoryRank = predictedCategories.findIndex(p => p.category === userSelectedCategory);
        const isTopPrediction = userCategoryRank === 0;
        const isTopTwo = userCategoryRank <= 1;
        
        if (confidence >= this.MATCH_CONFIDENCE_THRESHOLD && isTopTwo) {
          matchStatus = 'MATCH';
        } else if (confidence >= this.UNCERTAIN_THRESHOLD || isTopTwo) {
          matchStatus = 'UNCERTAIN';
        } else {
          matchStatus = 'MISMATCH';
          // Suggest the top prediction (which is now weighted by label count)
          if (predictedCategories.length > 0 && predictedCategories[0].category !== userSelectedCategory) {
            suggestedCategory = predictedCategories[0].category;
          }
        }
      } else {
        if (predictedCategories.length > 0) {
          matchStatus = 'MISMATCH';
          // Suggest the top prediction (weighted by label count and confidence)
          suggestedCategory = predictedCategories[0].category;
          confidence = predictedCategories[0].confidence;
        } else {
          matchStatus = 'UNCERTAIN';
          confidence = 0.3;
        }
      }
      
      // Additional check: if top prediction has significantly more matched labels, prefer it
      // This helps when confidence is similar but one has more specific matches
      if (predictedCategories.length >= 2) {
        const topPred = predictedCategories[0];
        const secondPred = predictedCategories[1];
        
        // If top prediction has 2+ more matched labels and confidence is close (within 0.05), prefer it
        if (topPred.matchedLabels.length >= secondPred.matchedLabels.length + 2 &&
            topPred.confidence >= secondPred.confidence - 0.05) {
          // Top prediction is more specific, use it
          if (matchStatus === 'MISMATCH' && !suggestedCategory) {
            suggestedCategory = topPred.category;
            confidence = topPred.confidence;
          }
        }
      }

      return {
        userSelectedCategory,
        aiPredictedCategories: predictedCategories,
        matchStatus,
        suggestedCategory,
        confidence,
        detectionMethod: 'clarifai-api',
      };
    } catch (error: any) {
      this.logger.error('Error in Clarifai category matching:', error.message);
      return this.matchCategoryFallback(userSelectedCategory);
    }
  }

  /**
   * Fallback food detection
   */
  private detectFoodFallback(): ClarifaiFoodDetectionResult {
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
  private matchCategoryFallback(userSelectedCategory: FoodType): ClarifaiCategoryMatchingResult {
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
    apiKeyConfigured: boolean;
    foodModel: string;
  }> {
    return {
      status: this.useClarifai ? 'operational' : 'fallback-mode',
      available: this.useClarifai,
      apiKeyConfigured: !!this.apiKey,
      foodModel: this.FOOD_MODEL_ID,
    };
  }
}

