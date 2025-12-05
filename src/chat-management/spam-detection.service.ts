import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

interface SpamDetectionRequest {
  content: string;
  conversationId: string;
  senderId: string;
}

interface SpamDetectionResult {
  is_spam: boolean;
  prediction: string;
  confidence: number;
  message: string;
}

@Injectable()
export class SpamDetectionService {
  private readonly logger = new Logger(SpamDetectionService.name);
  private readonly spamApiUrl = process.env.SPAM_API_URL || 'http://localhost:8000';
  private isServiceAvailable = false;

  constructor() {
    // Test connection on init
    this.testConnection();
  }

  /**
   * Test if FastAPI spam detection service is running
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.spamApiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        this.isServiceAvailable = data.models_loaded;
        this.logger.log(`✅ Spam Detection Service connected: ${data.status}`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Spam Detection Service not available at ${this.spamApiUrl}`);
      this.isServiceAvailable = false;
    }
  }

  /**
   * Analyze a message for spam
   */
  async analyzeMessage(request: SpamDetectionRequest): Promise<SpamDetectionResult> {
    if (!this.isServiceAvailable) {
      this.logger.warn('Spam detection service unavailable, allowing message anyway');
      return {
        is_spam: false,
        prediction: 'ham',
        confidence: 0,
        message: 'Spam detection service unavailable',
      };
    }

    try {
      this.logger.debug(`Analyzing message from ${request.senderId} in ${request.conversationId}`);

      const response = await fetch(`${this.spamApiUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: request.content,
          conversationId: request.conversationId,
          senderId: request.senderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SpamDetectionResult = await response.json();

      this.logger.debug(
        `Spam detection result: is_spam=${result.is_spam}, confidence=${result.confidence}%`
      );

      return result;
    } catch (error) {
      this.logger.error(`Error calling spam detection API: ${error.message}`);
      
      // Graceful degradation: allow message if service is down
      return {
        is_spam: false,
        prediction: 'ham',
        confidence: 0,
        message: 'Spam detection service unavailable',
      };
    }
  }

  /**
   * Analyze multiple messages (batch)
   */
  async analyzeMessagesBatch(
    requests: SpamDetectionRequest[]
  ): Promise<SpamDetectionResult[]> {
    if (!this.isServiceAvailable) {
      this.logger.warn('Spam detection service unavailable for batch, allowing all messages');
      return requests.map(() => ({
        is_spam: false,
        prediction: 'ham',
        confidence: 0,
        message: 'Spam detection service unavailable',
      }));
    }

    try {
      this.logger.debug(`Batch analyzing ${requests.length} messages`);

      const response = await fetch(`${this.spamApiUrl}/detect-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requests),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      this.logger.error(`Error in batch spam detection: ${error.message}`);

      // Fallback: mark all as not spam
      return requests.map(() => ({
        is_spam: false,
        prediction: 'ham',
        confidence: 0,
        message: 'Spam detection service unavailable',
      }));
    }
  }

  /**
   * Check if a message should be filtered (very high spam confidence)
   */
  shouldFilterMessage(result: SpamDetectionResult, threshold: number = 90): boolean {
    return result.is_spam && result.confidence >= threshold;
  }

  /**
   * Get spam detection status
   */
  async getStatus(): Promise<{ status: string; available: boolean }> {
    try {
      const response = await fetch(`${this.spamApiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status,
          available: data.models_loaded,
        };
      }
    } catch (error) {
      this.logger.error(`Error getting spam service status: ${error.message}`);
    }

    return {
      status: 'error',
      available: false,
    };
  }
}
