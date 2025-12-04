import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatManagementService } from './chat-management.service';
import { SpamDetectionService } from './spam-detection.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({ cors: true })
export class ChatManagementGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatManagementGateway.name);

  constructor(
    private readonly chatService: ChatManagementService,
    private readonly spamDetectionService: SpamDetectionService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const userId = this.extractUserId(client);
      client.data.userId = userId;
      this.logger.debug(`Client ${client.id} connected as ${userId}`);
    } catch (error) {
      this.logger.warn(`Unauthorized socket connection: ${error.message}`);
      client.emit('error', 'Unauthorized');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  // 📩 Client envoie un message
  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, payload: CreateMessageDto) {
    try {
      const senderId = client.data.userId || this.extractUserId(client);
      
      // 🔍 Analyze message for spam
      const spamAnalysis = await this.spamDetectionService.analyzeMessage({
        content: payload.content,
        conversationId: payload.conversationId,
        senderId: senderId,
      });

      this.logger.log(
        `Message spam analysis: is_spam=${spamAnalysis.is_spam}, confidence=${spamAnalysis.confidence}%`
      );

      // Save message with spam detection info
      const saved = await this.chatService.sendMessage({
        conversationId: payload.conversationId,
        senderId,
        content: payload.content,
        type: payload.type,
        meta: payload.meta,
        isSpam: spamAnalysis.is_spam,
        spamConfidence: spamAnalysis.confidence,
      });

      // Diffuse à tous les clients dans la room (conversation)
      this.server.to(payload.conversationId).emit('new_message', saved);

      return { status: 'ok', message: saved };
    } catch (err) {
      this.logger.error(`Error sending message: ${err.message}`);
      return { status: 'error', error: err.message };
    }
  }

  // 👥 Client rejoint une conversation (room)
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(client: Socket, payload: { conversationId: string }) {
    if (!payload?.conversationId) {
      throw new WsException('conversationId is required');
    }

    const userId = client.data.userId || this.extractUserId(client);
    await this.chatService.getConversationForUser(payload.conversationId, userId);
    client.join(payload.conversationId);
    this.logger.debug(`Client ${client.id} joined conversation ${payload.conversationId}`);
  }

  private extractUserId(client: Socket): string {
    const authHeader = client.handshake.headers?.authorization;
    const headerToken =
      typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;

    const token =
      client.handshake.auth?.token ||
      client.handshake.query?.token?.toString() ||
      headerToken;

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    const payload = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET || 'supersecretkey',
    });

    const userId = payload?.sub || payload?.userId;
    if (!userId) {
      throw new WsException('Invalid token payload');
    }

    return userId;
  }
}
