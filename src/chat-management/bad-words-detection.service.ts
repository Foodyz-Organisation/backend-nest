import { Injectable, Logger } from '@nestjs/common';

/**
 * Interface for bad words detection response from Gradio API
 */
interface BadWordsDetectionResponse {
  moderatedContent: string;
  wasModified: boolean;
  originalContent: string;
  detectionMethod: 'gradio' | 'bad-words-library' | 'none';
}

/**
 * Service for detecting and moderating bad words in message content.
 * Integrates with Gradio API for AI-powered content moderation.
 * Falls back to local bad words list for detection if Gradio is unavailable.
 */
@Injectable()
export class BadWordsDetectionService {
  private readonly logger = new Logger(BadWordsDetectionService.name);
  private readonly gradioApiUrl = 'http://127.0.0.1:7860';
  private readonly apiEndpoint = '/gradio_api/call/moderate_json_input';
  private badWordsList: Set<string>;
  private useLocalFilterOnly: boolean = false;

  constructor() {
    // Initialize bad words list with common profanity
    this.badWordsList = new Set();
    
    // Load English bad words from badwords-list package
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const badwordsArray = require('badwords-list').array;
      badwordsArray.forEach((word: string) => this.badWordsList.add(word.toLowerCase()));
    } catch (error) {
      this.logger.warn('Could not load badwords-list, using custom list only');
    }
    
    // Add custom French bad words
    const frenchBadWords = [
      'merde', 'putain', 'connard', 'salaud', 'salope', 'enculé', 'enculer',
      'connasse', 'con', 'conne', 'bordel', 'chier', 'foutre', 'bite', 'couille',
      'pute', 'batard', 'bâtard', 'niquer', 'nique', 'pd', 'fdp', 'ntm'
    ];
    
    frenchBadWords.forEach(word => this.badWordsList.add(word.toLowerCase()));
    
    this.logger.log(`Bad words detection service initialized with ${this.badWordsList.size} words in filter`);
  }

  /**
   * Analyze message content for bad words and return moderated version.
   * Uses Gradio API first, falls back to local bad-words library if unavailable.
   * 
   * @param content - The message content to analyze
   * @param conversationId - The conversation ID
   * @param senderId - The sender ID
   * @returns Promise containing moderation results
   */
  async moderateMessage(
    content: string,
    conversationId: string,
    senderId: string,
  ): Promise<BadWordsDetectionResponse> {
    // If configured to use local filter only, skip Gradio
    if (this.useLocalFilterOnly) {
      this.logger.log('Using local filter only (Gradio disabled)');
      return this.moderateWithLocalFilter(content);
    }

    try {
      this.logger.log(`Moderating message from sender: ${senderId}`);

      // Prepare the JSON payload for Gradio API
      const messagePayload = {
        content,
        conversationId,
        senderId,
      };

      const jsonInput = JSON.stringify(messagePayload);

      // Step 1: Call Gradio API to initiate the request
      const callResponse = await fetch(`${this.gradioApiUrl}${this.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [jsonInput],
        }),
      });

      if (!callResponse.ok) {
        throw new Error(`Gradio API call returned status ${callResponse.status}`);
      }

      const callResult = await callResponse.json();
      const eventId = callResult.event_id;

      if (!eventId) {
        throw new Error('No event_id returned from Gradio API');
      }

      // Step 2: Get the result using the event_id
      const resultResponse = await fetch(
        `${this.gradioApiUrl}/gradio_api/call/moderate_json_input/${eventId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'text/event-stream',
          },
        }
      );

      if (!resultResponse.ok) {
        throw new Error(`Gradio API result returned status ${resultResponse.status}`);
      }

      // Parse Server-Sent Events stream
      const resultText = await resultResponse.text();
      
      // Extract the data from the SSE stream (last data: line)
      const lines = resultText.trim().split('\n');
      let moderatedPayload: any = null;

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
          if (data && data.length > 0) {
            moderatedPayload = JSON.parse(data[0]);
          }
        }
      }

      if (!moderatedPayload) {
        throw new Error('No valid data returned from Gradio API');
      }

      const originalContent = content;
      const moderatedContent = moderatedPayload.content;
      const wasModified = originalContent !== moderatedContent;

      this.logger.log(
        `Moderation complete. Was modified: ${wasModified}`,
      );

      return {
        moderatedContent,
        wasModified,
        originalContent,
        detectionMethod: 'gradio',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.warn(
        `Gradio API unavailable: ${errorMessage}. Falling back to local filter.`,
      );

      // Fallback to local bad-words filter
      return this.moderateWithLocalFilter(content);
    }
  }

  /**
   * Moderate message using local bad words list.
   * 
   * @param content - The message content to moderate
   * @returns BadWordsDetectionResponse
   */
  private moderateWithLocalFilter(content: string): BadWordsDetectionResponse {
    try {
      let moderatedContent = content;
      let wasModified = false;

      // Split content into words and check each one
      const words = content.split(/\b/);
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase().trim();
        if (word && this.badWordsList.has(word)) {
          // Replace bad word with asterisks
          words[i] = '*'.repeat(words[i].length);
          wasModified = true;
        }
      }

      if (wasModified) {
        moderatedContent = words.join('');
      }
      
      this.logger.log(
        `Local filter moderation: wasModified=${wasModified}`,
      );

      return {
        moderatedContent,
        wasModified,
        originalContent: content,
        detectionMethod: 'bad-words-library',
      };
    } catch (error) {
      this.logger.error('Error in local filter moderation', error);
      return {
        moderatedContent: content,
        wasModified: false,
        originalContent: content,
        detectionMethod: 'none',
      };
    }
  }

  /**
   * Check if message contains bad words without returning moderated content.
   * 
   * @param content - The message content to check
   * @param conversationId - The conversation ID
   * @param senderId - The sender ID
   * @returns Promise<boolean> - True if bad words detected
   */
  async containsBadWords(
    content: string,
    conversationId: string,
    senderId: string,
  ): Promise<boolean> {
    const result = await this.moderateMessage(content, conversationId, senderId);
    return result.wasModified;
  }

  /**
   * Add custom words to the local filter.
   * 
   * @param words - Array of words to add
   */
  addCustomWords(words: string[]): void {
    words.forEach(word => this.badWordsList.add(word.toLowerCase()));
    this.logger.log(`Added ${words.length} custom words to filter (total: ${this.badWordsList.size})`);
  }

  /**
   * Remove words from the local filter.
   * 
   * @param words - Array of words to remove
   */
  removeWords(words: string[]): void {
    words.forEach(word => this.badWordsList.delete(word.toLowerCase()));
    this.logger.log(`Removed ${words.length} words from filter (total: ${this.badWordsList.size})`);
  }

  /**
   * Enable or disable local filter only mode.
   * 
   * @param enabled - Whether to use only local filter
   */
  setLocalFilterOnly(enabled: boolean): void {
    this.useLocalFilterOnly = enabled;
    this.logger.log(`Local filter only mode: ${enabled}`);
  }

  /**
   * Health check for Gradio API availability.
   * 
   * @returns Promise<boolean> - True if API is available
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gradioApiUrl}/`, {
        method: 'HEAD',
      });
      return response.ok;
    } catch (error) {
      this.logger.warn('Gradio API is not available');
      return false;
    }
  }
}
