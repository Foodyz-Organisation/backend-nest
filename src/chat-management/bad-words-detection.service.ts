import { Injectable, Logger } from '@nestjs/common';

/**
 * Interface for bad words detection response from Gradio API
 */
interface BadWordsDetectionResponse {
  moderatedContent: string;
  wasModified: boolean;
  originalContent: string;
}

/**
 * Service for detecting and moderating bad words in message content.
 * Integrates with Gradio API for AI-powered content moderation.
 */
@Injectable()
export class BadWordsDetectionService {
  private readonly logger = new Logger(BadWordsDetectionService.name);
  private readonly gradioApiUrl = 'http://127.0.0.1:7860';
  private readonly apiEndpoint = '/gradio_api/call/moderate_json_input';

  /**
   * Analyze message content for bad words and return moderated version.
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
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Error moderating message: ${errorMessage}`,
        errorStack,
      );

      // Return original content if moderation fails (graceful degradation)
      return {
        moderatedContent: content,
        wasModified: false,
        originalContent: content,
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
