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
} from '@nestjs/common';
import { ChatManagementService } from './chat-management.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat')
@UseGuards(AuthGuard('jwt')) // adapte selon ton guard
export class ChatManagementController {
  constructor(private readonly chatService: ChatManagementService) {}

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
    return this.chatService.sendMessage({
      conversationId,
      senderId,
      content: dto.content,
      type: dto.type,
      meta: dto.meta,
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
