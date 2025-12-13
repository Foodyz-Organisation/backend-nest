import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  Logger,
  Delete,
} from '@nestjs/common';
import { ChatManagementService } from './chat-management.service';
import { SpamDetectionService } from './spam-detection.service';
import { BadWordsDetectionService } from './bad-words-detection.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat')
@UseGuards(AuthGuard('jwt')) // adapte selon ton guard
export class ChatManagementController {
  private readonly logger = new Logger(ChatManagementController.name);

  constructor(
    private readonly chatService: ChatManagementService,
    private readonly spamDetectionService: SpamDetectionService,
    private readonly badWordsDetectionService: BadWordsDetectionService,
  ) { }

  private getUserId(request: any): string {
    const userId = request.user?.userId || request.user?.sub || request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user context');
    }
    return userId;
  }

  // 🔹 Créer une nouvelle conversation
  @Post('conversations')
  async createConversation(@Body() dto: CreateConversationDto, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.createConversation(dto, userId);
  }

  // 🔹 Récupérer les conversations de l'utilisateur courant
  @Get('conversations')
  async getMyConversations(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.getConversationsForUser(userId);
  }

  @Get('chats')
  async getChats(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.getChatsForUser(userId);
  }

  @Get('peers')
  async getPeers(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.listPeers(userId);
  }

  // 🔹 Récupérer une conversation spécifique
  @Get('conversations/:id')
  async getConv(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.getConversationForUser(id, userId);
  }

  // 🔹 Envoyer un message dans une conversation
  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    const senderId = this.getUserId(req);

    // 🔍 Analyze message for spam
    const spamAnalysis = await this.spamDetectionService.analyzeMessage({
      content: dto.content,
      conversationId,
      senderId,
    });

    this.logger.log(
      `Message spam analysis: is_spam=${spamAnalysis.is_spam}, confidence=${spamAnalysis.confidence}%`
    );

    // 🤬 Analyze message for bad words and moderate content
    const moderationResult = await this.badWordsDetectionService.moderateMessage(
      dto.content,
      conversationId,
      senderId,
    );

    this.logger.log(
      `Message moderation: has_bad_words=${moderationResult.wasModified}`
    );

    return this.chatService.sendMessage({
      conversationId,
      senderId,
      content: dto.content,
      type: dto.type,
      meta: dto.meta,
      isSpam: spamAnalysis.is_spam,
      spamConfidence: spamAnalysis.confidence,
      hasBadWords: moderationResult.wasModified,
      moderatedContent: moderationResult.moderatedContent,
    });
  }

  // 🔹 Récupérer les messages d’une conversation
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit = '50',
    @Query('before') before?: string,
    @Req() req?: any,
  ) {
    const userId = this.getUserId(req);
    const lim = parseInt(limit, 10) || 50;
    const beforeDate = before ? new Date(before) : undefined;
    return this.chatService.getMessagesForUser(id, userId, lim, beforeDate);
  }
  // 🔹 Tester la détection de mots inappropriés
  @Post('test/bad-words')
  async testBadWords(@Body() body: { content: string }) {
    const result = await this.badWordsDetectionService.moderateMessage(
      body.content,
      'test-conversation',
      'test-user',
    );
    return {
      original: result.originalContent,
      moderated: result.moderatedContent,
      wasModified: result.wasModified,
      detectionMethod: result.detectionMethod,
    };
  }

  // 🔹 Vérifier la disponibilité de l'API Gradio
  @Get('test/gradio-status')
  async checkGradioStatus() {
    const isAvailable = await this.badWordsDetectionService.isApiAvailable();
    return {
      gradioApi: {
        available: isAvailable,
        status: isAvailable ? 'online' : 'offline',
      },
      localFilter: {
        available: true,
        status: 'active',
      },
    };
  }

  // 🔹 Ajouter des mots personnalisés au filtre
  @Post('admin/bad-words/add')
  async addCustomWords(@Body() body: { words: string[] }) {
    this.badWordsDetectionService.addCustomWords(body.words);
    return {
      success: true,
      message: `Added ${body.words.length} custom words to filter`,
    };
  }

  // 🔹 Retirer des mots du filtre
  @Post('admin/bad-words/remove')
  async removeWords(@Body() body: { words: string[] }) {
    this.badWordsDetectionService.removeWords(body.words);
    return {
      success: true,
      message: `Removed ${body.words.length} words from filter`,
    };
  }

  // 🔹 Tester la détection de spam
  @Post('test/spam-detection')
  async testSpamDetection(@Body() body: { content: string }) {
    const result = await this.spamDetectionService.analyzeMessage({
      content: body.content,
      conversationId: 'test-conversation',
      senderId: 'test-user',
    });
    return {
      content: body.content,
      isSpam: result.is_spam,
      prediction: result.prediction,
      confidence: result.confidence,
      isFiltered: this.spamDetectionService.shouldFilterMessage(result),
      message: result.message,
    };
  }

  // 🔹 Analyser plusieurs messages en lot
  @Post('test/spam-batch')
  async testSpamBatch(@Body() body: { messages: string[] }) {
    const messagesWithIds = body.messages.map((content) => ({
      content,
      conversationId: 'test-batch',
      senderId: 'test-user',
    }));

    const results = await this.spamDetectionService.analyzeMessagesBatch(
      messagesWithIds,
    );

    return {
      total: body.messages.length,
      results: results.map((result, index) => ({
        message: body.messages[index],
        isSpam: result.is_spam,
        prediction: result.prediction,
        confidence: result.confidence,
        isFiltered: this.spamDetectionService.shouldFilterMessage(result),
      })),
    };
  }

  // 🔹 Vérifier le statut du service de détection de spam
  @Get('test/spam-status')
  async checkSpamServiceStatus() {
    const status = await this.spamDetectionService.getStatus();
    return {
      spamDetectionService: {
        available: status.available,
        status: status.available ? 'online' : 'offline',
        endpoint: status.endpoint || 'http://localhost:8000',
        lastCheck: status.lastCheck,
      },
      filterThreshold: 0.7,
      testConnection: status.available,
    };
  }

  // 🔹 Tester la connexion au service FastAPI
  @Get('test/spam-connection')
  async testSpamConnection() {
    const result = await this.spamDetectionService.checkConnection();
    return result;
  }

  // 🔹 Supprimer une conversation spécifique
  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.deleteConversation(id, userId);
  }

  // 🔹 Supprimer toutes les conversations de l'utilisateur (Reset)
  @Delete('conversations')
  async deleteAllConversations(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.chatService.deleteAllConversations(userId);
  }
}
