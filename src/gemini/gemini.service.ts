import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;
    private workingModel: string | null = null;

    // Models to try in order of preference
    private readonly MODELS_TO_TRY = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-002',
        'gemini-1.5-pro-002',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
    ];

    constructor(private configService: ConfigService) {
        // Use dedicated API key for menu suggestions (separate from reclamation/points system)
        const apiKey = this.configService.get<string>('GEMINI_API_KEY_MENU_SUGGESTIONS');

        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY_MENU_SUGGESTIONS not found in environment variables. AI suggestions will not work.');
            this.logger.warn('Please add GEMINI_API_KEY_MENU_SUGGESTIONS to your .env file');
        } else {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.testGeminiModel(apiKey); // Test async (doesn't block startup)
        }
    }

    /**
     * Test which Gemini model works with the API key
     */
    private async testGeminiModel(apiKey: string): Promise<void> {
        this.logger.log('🧪 Testing Gemini models...');

        // First, try to list available models
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
            );

            if (response.ok) {
                const data = await response.json();
                const availableModels = data.models
                    ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: any) => m.name.replace('models/', '')) || [];

                if (availableModels.length > 0) {
                    this.logger.log(`📋 Available models: ${availableModels.join(', ')}`);

                    // Test the first available model
                    for (const modelName of availableModels) {
                        if (await this.testSingleModel(modelName)) {
                            return;
                        }
                    }
                }
            }
        } catch (error: any) {
            this.logger.warn(`⚠️ Error listing models: ${error.message}`);
        }

        // Fallback: test known models
        for (const modelName of this.MODELS_TO_TRY) {
            if (await this.testSingleModel(modelName)) {
                return;
            }
        }

        this.logger.error('❌ No Gemini model available!');
        this.logger.error('   Please check your GEMINI_API_KEY at: https://aistudio.google.com/app/apikey');
    }

    /**
     * Test a specific model
     */
    private async testSingleModel(modelName: string): Promise<boolean> {
        try {
            this.logger.log(`   Testing: ${modelName}...`);
            const testModel = this.genAI.getGenerativeModel({ model: modelName });

            // Simple test with timeout
            const result = await Promise.race([
                testModel.generateContent('Hi'),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )
            ]) as any;

            const text = result.response?.text();

            if (text && text.length > 0) {
                this.workingModel = modelName;
                this.model = testModel;
                this.logger.log(`✅ Gemini model validated: ${modelName}`);
                return true;
            }
        } catch (error: any) {
            this.logger.warn(`   ⚠️ ${modelName}: ${error.message}`);
        }
        return false;
    }

    /**
     * Generate suggestions for a menu item (Best Combination & Popular Choice)
     * Returns actual ingredient and option selections instead of text descriptions
     */
    async generateMenuItemSuggestions(menuItem: any): Promise<{
        bestCombination: {
            ingredients: string[];
            options: string[];
            description: string;
        };
        popularChoice: {
            ingredients: string[];
            options: string[];
            description: string;
        };
        reasoning: string;
    }> {
        if (!this.model || !this.workingModel) {
            this.logger.warn('No working Gemini model available for suggestions');
            return {
                bestCombination: {
                    ingredients: [],
                    options: [],
                    description: "AI service unavailable"
                },
                popularChoice: {
                    ingredients: [],
                    options: [],
                    description: "AI service unavailable"
                },
                reasoning: "Please check API configuration and ensure a valid GEMINI_API_KEY_MENU_SUGGESTIONS is set."
            };
        }

        try {
            const prompt = this.buildSuggestionPrompt(menuItem);

            this.logger.debug(`Requesting suggestions for ${menuItem.name} using ${this.workingModel}`);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseSuggestionResponse(text, menuItem);
        } catch (error) {
            this.logger.error('Error generating menu suggestions', error);
            return {
                bestCombination: {
                    ingredients: [],
                    options: [],
                    description: "Could not generate suggestion"
                },
                popularChoice: {
                    ingredients: [],
                    options: [],
                    description: "Could not generate suggestion"
                },
                reasoning: "An error occurred while contacting AI service."
            };
        }
    }

    private buildSuggestionPrompt(item: any): string {
        // Construct ingredient names list
        const ingredientNames = item.ingredients && item.ingredients.length > 0
            ? item.ingredients.map((i: any) => i.name)
            : [];

        const optionNames = item.options && item.options.length > 0
            ? item.options.map((o: any) => o.name)
            : [];

        // Build detailed ingredient list for context
        const ingredientsList = item.ingredients && item.ingredients.length > 0
            ? item.ingredients.map((i: any) => `- ${i.name} (Default: ${i.isDefault})`).join('\n')
            : 'No specific ingredients listed.';

        const optionsList = item.options && item.options.length > 0
            ? item.options.map((o: any) => `- ${o.name} (Price: +$${o.price})`).join('\n')
            : 'No extra options listed.';

        return `
You are a gourmet food critic and helpful restaurant assistant.
Analyze the following Menu Item and provide TWO distinct recommendation sets for a customer.

**Menu Item**: ${item.name}
**Description**: ${item.description || 'N/A'}
**Category**: ${item.category}

**Available Ingredients**:
${ingredientsList}

**Available Options/Add-ons**:
${optionsList}

**IMPORTANT**: You MUST ONLY use ingredient and option names from the lists above. Do not invent new ingredients.

**YOUR TASK**:
1. **Best Combination**: Select specific ingredients and options for a "Chef's Choice" gourmet combination. Focus on flavor balance.
2. **Popular Choice**: Select specific ingredients and options that a typical customer would love (the crowd favorite).

For each combination, return:
- An array of ingredient names to include (from the available ingredients list)
- An array of option names to add (from the available options list)
- A brief description explaining why this combination works

**RESPONSE FORMAT (JSON ONLY)**:
Return a valid JSON object (no markdown code blocks, just raw JSON):
{
  "bestCombination": {
    "ingredients": ["ingredient1", "ingredient2", ...],
    "options": ["option1", ...],
    "description": "Brief explanation of this gourmet combo"
  },
  "popularChoice": {
    "ingredients": ["ingredient1", "ingredient2", ...],
    "options": ["option1", ...],
    "description": "Brief explanation of this popular combo"
  },
  "reasoning": "Overall reasoning for these two suggestions (max 2 sentences)"
}
`;
    }

    private parseSuggestionResponse(text: string, menuItem: any): {
        bestCombination: { ingredients: string[]; options: string[]; description: string };
        popularChoice: { ingredients: string[]; options: string[]; description: string };
        reasoning: string;
    } {
        try {
            // Clean up potential markdown code blocks if the AI adds them
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleanText);

            // Get valid ingredient and option names from menu item
            const validIngredients = new Set(
                menuItem.ingredients?.map((i: any) => i.name.toLowerCase()) || []
            );
            const validOptions = new Set(
                menuItem.options?.map((o: any) => o.name.toLowerCase()) || []
            );

            // Validate and filter ingredients for best combination
            const bestIngredients = (json.bestCombination?.ingredients || [])
                .filter((ing: string) => validIngredients.has(ing.toLowerCase()));

            const bestOptions = (json.bestCombination?.options || [])
                .filter((opt: string) => validOptions.has(opt.toLowerCase()));

            // Validate and filter ingredients for popular choice
            const popularIngredients = (json.popularChoice?.ingredients || [])
                .filter((ing: string) => validIngredients.has(ing.toLowerCase()));

            const popularOptions = (json.popularChoice?.options || [])
                .filter((opt: string) => validOptions.has(opt.toLowerCase()));

            return {
                bestCombination: {
                    ingredients: bestIngredients,
                    options: bestOptions,
                    description: json.bestCombination?.description || "Gourmet combination"
                },
                popularChoice: {
                    ingredients: popularIngredients,
                    options: popularOptions,
                    description: json.popularChoice?.description || "Customer favorite"
                },
                reasoning: json.reasoning || "AI-generated suggestions based on flavor profiles"
            };
        } catch (e) {
            this.logger.warn('Failed to parse AI JSON response, returning default suggestions');
            // Return default ingredients (all default ones)
            const defaultIngredients = menuItem.ingredients
                ?.filter((i: any) => i.isDefault)
                .map((i: any) => i.name) || [];

            return {
                bestCombination: {
                    ingredients: defaultIngredients,
                    options: [],
                    description: "Default combination"
                },
                popularChoice: {
                    ingredients: defaultIngredients,
                    options: [],
                    description: "Standard style"
                },
                reasoning: "Could not parse AI response, showing default ingredients"
            };
        }
    }
}
