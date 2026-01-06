import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from '@gradio/client';

@Injectable()
export class MealScannerService implements OnModuleInit {
  private gradioClient: Client;
  private readonly gradioUrl = 'http://127.0.0.1:7860/';

  async onModuleInit() {
    try {
      this.gradioClient = await Client.connect(this.gradioUrl);
      console.log('✅ Connected to Gradio API at', this.gradioUrl);
    } catch (error) {
      console.error('❌ Failed to connect to Gradio API:', error.message);
      console.error('Make sure Gradio is running: cd src/foodscan_ai && python3 main.py');
    }
  }

  /**
   * Analyze a meal using Gradio AI API
   */
  async analyzeMeal(
    mealDescription: string,
    imageBuffer: Buffer,
    age: number,
    condition: string,
    goal: string,
  ): Promise<any> {
    if (!this.gradioClient) {
      throw new Error('Gradio client not connected. Make sure Gradio server is running on port 7860');
    }

    try {
      // Convert buffer to Blob
      const imageBlob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });

      const result = await this.gradioClient.predict('/analyze_tab', {
        meal: mealDescription,
        image: imageBlob,
        age: age,
        condition: condition,
        goal: goal,
      });

      return result.data[0]; // Returns the markdown string
    } catch (error) {
      throw new Error(`Gradio API error: ${error.message}`);
    }
  }

  /**
   * Get recipe suggestions from Gradio API
   */
  async getRecipeSuggestions(
    ingredients: string,
    condition: string,
    age: number,
  ): Promise<any> {
    if (!this.gradioClient) {
      throw new Error('Gradio client not connected. Make sure Gradio server is running on port 7860');
    }

    try {
      const result = await this.gradioClient.predict('/cook_tab', {
        ingredients: ingredients,
        condition: condition,
        age: age,
      });

      return result.data[0]; // Returns the markdown string
    } catch (error) {
      throw new Error(`Gradio API error: ${error.message}`);
    }
  }

  /**
   * Generate exercise plan from Gradio API
   */
  async generateExercisePlan(
    age: number,
    goal: string,
    condition: string,
  ): Promise<any> {
    if (!this.gradioClient) {
      throw new Error('Gradio client not connected. Make sure Gradio server is running on port 7860');
    }

    try {
      const result = await this.gradioClient.predict('/sport_tab', {
        age: age,
        goal: goal,
        condition: condition,
      });

      return result.data[0]; // Returns the markdown string
    } catch (error) {
      throw new Error(`Gradio API error: ${error.message}`);
    }
  }
}
