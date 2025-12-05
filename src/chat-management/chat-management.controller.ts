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
  ) {}

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
}
