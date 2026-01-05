import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';
import { HuggingFaceFoodDetectionService } from './huggingface-food-detection.service';
import { ClarifaiFoodDetectionService } from './clarifai-food-detection.service';

/**
 * Interface for food detection result
 */
export interface FoodDetectionResult {
  isFood: boolean;
  confidence: number;
  labels: Array<{
    description: string;
    score: number;
  }>;
  detectionMethod: 'clarifai-api' | 'huggingface-api' | 'vision-api' | 'fallback';
}

/**
 * Service for detecting if uploaded images/videos contain food-related content.
 * Uses Google Cloud Vision API to analyze images and determine if they are food-related.
 * 
 * Similar pattern to BadWordsDetectionService and SpamDetectionService.
 */
@Injectable()
export class FoodDetectionService {
  private readonly logger = new Logger(FoodDetectionService.name);
  private readonly visionClient: ImageAnnotatorClient | null = null;
  private readonly useVisionAPI: boolean = false;
  private readonly clarifaiService: ClarifaiFoodDetectionService;
  private readonly huggingFaceService: HuggingFaceFoodDetectionService;
  private readonly FOOD_CONFIDENCE_THRESHOLD = 0.3; // Minimum confidence to consider as food
  private readonly MIN_FOOD_LABEL_SCORE = 0.5; // Minimum score for individual food labels

  // Common food-related labels from Vision API
  private readonly FOOD_LABELS = [
    'food', 'dish', 'cuisine', 'meal', 'restaurant', 'cooking', 'recipe',
    'pizza', 'burger', 'pasta', 'sushi', 'taco', 'sandwich', 'salad',
    'soup', 'dessert', 'breakfast', 'lunch', 'dinner', 'snack',
    'ingredient', 'vegetable', 'fruit', 'meat', 'seafood', 'chicken',
    'bread', 'rice', 'noodle', 'sauce', 'spice', 'beverage', 'drink'
  ];

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
          this.logger.log('✅ Google Cloud Vision API available as fallback');
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
   * Analyze an image to determine if it contains food-related content.
   * Tries Clarifai first (most reliable free), then Hugging Face, then Google Cloud Vision, then fallback.
   * 
   * @param imageBuffer - Buffer containing the image data
   * @param imageUrl - Optional URL of the image (for remote images)
   * @returns Promise<FoodDetectionResult> - Detection result with confidence score
   */
  async detectFood(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<FoodDetectionResult> {
    // Try Clarifai first (most reliable free option)
    try {
      const clarifaiResult = await this.clarifaiService.detectFood(imageBuffer, imageUrl);
      if (clarifaiResult.detectionMethod === 'clarifai-api') {
        return {
          isFood: clarifaiResult.isFood,
          confidence: clarifaiResult.confidence,
          labels: clarifaiResult.labels,
          detectionMethod: 'clarifai-api',
        };
      }
    } catch (error) {
      this.logger.warn('Clarifai detection failed, trying Hugging Face...', error);
    }

    // Try Hugging Face second (free, but less reliable)
    try {
      const huggingFaceResult = await this.huggingFaceService.detectFood(imageBuffer, imageUrl);
      if (huggingFaceResult.detectionMethod === 'huggingface-api') {
        return {
          isFood: huggingFaceResult.isFood,
          confidence: huggingFaceResult.confidence,
          labels: huggingFaceResult.labels,
          detectionMethod: 'huggingface-api',
        };
      }
    } catch (error) {
      this.logger.warn('Hugging Face detection failed, trying Google Cloud Vision...', error);
    }

    // Fallback to Google Cloud Vision if available
    if (this.useVisionAPI && this.visionClient) {
      try {
        return await this.detectFoodWithVisionAPI(imageBuffer, imageUrl);
      } catch (error) {
        this.logger.error('Error using Vision API for food detection:', error);
        // Continue to final fallback
      }
    }

    // Final fallback mode
    this.logger.warn('Using fallback food detection (no APIs available)');
    return this.detectFoodFallback(imageBuffer);
  }

  /**
   * Detect food using Google Cloud Vision API
   */
  private async detectFoodWithVisionAPI(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<FoodDetectionResult> {
    if (!this.visionClient) {
      throw new Error('Vision API client is not initialized');
    }

    try {
      let request: any;

      if (imageBuffer) {
        // Use buffer if provided
        request = {
          image: { content: imageBuffer },
        };
      } else if (imageUrl) {
        // Use URL if provided
        request = {
          image: { source: { imageUri: imageUrl } },
        };
      } else {
        throw new BadRequestException('Either imageBuffer or imageUrl must be provided');
      }

      // Request label detection
      const [result] = await this.visionClient.labelDetection(request);
      const labels = result.labelAnnotations || [];

      // Filter food-related labels
      const foodLabels = labels
        .filter(label => {
          const description = label.description?.toLowerCase() || '';
          const score = label.score ?? 0; // Handle null/undefined
          return this.FOOD_LABELS.some(foodLabel => 
            description.includes(foodLabel.toLowerCase())
          ) || score >= this.MIN_FOOD_LABEL_SCORE;
        })
        .map(label => ({
          description: label.description || '',
          score: label.score ?? 0, // Handle null/undefined
        }))
        .sort((a, b) => b.score - a.score); // Sort by score descending

      // Calculate overall food confidence
      // Use the highest food-related label score, or average of top 3
      const topFoodLabels = foodLabels.slice(0, 3);
      const confidence = topFoodLabels.length > 0
        ? topFoodLabels.reduce((sum, label) => sum + label.score, 0) / topFoodLabels.length
        : 0;

      const isFood = confidence >= this.FOOD_CONFIDENCE_THRESHOLD;

      this.logger.debug(
        `Food detection result: isFood=${isFood}, confidence=${confidence.toFixed(2)}, labels=${foodLabels.length}`
      );

      return {
        isFood,
        confidence,
        labels: foodLabels,
        detectionMethod: 'vision-api',
      };
    } catch (error: any) {
      this.logger.error('Error in Vision API food detection:', error);
      
      // Check if it's a billing error
      if (error?.code === 7 || error?.message?.includes('billing')) {
        this.logger.error(
          '⚠️ BILLING NOT ENABLED: Google Cloud Vision API requires billing to be enabled. ' +
          'Even with free tier, billing must be enabled. ' +
          'Visit: https://console.developers.google.com/billing/enable?project=YOUR_PROJECT_ID'
        );
        // Fall back gracefully instead of throwing
        return this.detectFoodFallback(imageBuffer);
      }
      
      // For other errors, throw
      throw new BadRequestException(`Food detection failed: ${error.message}`);
    }
  }

  /**
   * Fallback food detection (basic validation)
   * This is a simple fallback when Vision API is not available
   */
  private detectFoodFallback(imageBuffer?: Buffer): FoodDetectionResult {
    // Basic fallback: if we have an image buffer, assume it might be food
    // In production, you might want to implement a more sophisticated fallback
    this.logger.warn('Using fallback food detection - accepting all images');
    
    return {
      isFood: true, // Accept by default in fallback mode
      confidence: 0.5, // Medium confidence
      labels: [],
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

