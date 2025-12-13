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
import { BadWordsDetectionService } from './bad-words-detection.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({ cors: true })
export class ChatManagementGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatManagementGateway.name);

  constructor(
    private readonly chatService: ChatManagementService,
    private readonly spamDetectionService: SpamDetectionService,
    private readonly badWordsDetectionService: BadWordsDetectionService,
    private readonly jwtService: JwtService,
  ) { }

  afterInit() {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const userId = this.extractUserId(client);
      client.data.userId = userId;
      // Join a room named after the user ID to allow targeted messages (e.g. incoming calls)
      client.join(userId);
      this.logger.debug(`Client ${client.id} connected as ${userId} and joined room ${userId}`);
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

      // 🤬 Analyze message for bad words and moderate content
      const moderationResult = await this.badWordsDetectionService.moderateMessage(
        payload.content,
        payload.conversationId,
        senderId,
      );

      this.logger.log(
        `Message moderation: has_bad_words=${moderationResult.wasModified}`
      );

      // Save message with spam detection and moderation info
      const saved = await this.chatService.sendMessage({
        conversationId: payload.conversationId,
        senderId,
        content: payload.content,
        type: payload.type,
        meta: payload.meta,
        isSpam: spamAnalysis.is_spam,
        spamConfidence: spamAnalysis.confidence,
        hasBadWords: moderationResult.wasModified,
        moderatedContent: moderationResult.moderatedContent,
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

  // 📞 WebRTC Signaling Events

  @SubscribeMessage('call_user')
  async handleCallUser(client: Socket, payload: { conversationId: string; offer: any }) {
    const room = payload?.conversationId;
    if (!room) {
      this.logger.warn(`call_user without conversationId from ${client.id}`);
      return;
    }

    try {
      const userId = client.data.userId || this.extractUserId(client);
      // Retrieve conversation to get participants
      const conversation = await this.chatService.getConversationForUser(room, userId);

      client.join(room);
      this.logger.debug(`Call initiated in conversation ${room} by ${client.id}`);

      // Emit call_made to conversation room (for backward compatibility or active chats)
      client.to(room).emit('call_made', {
        offer: payload.offer,
        socket: client.id,
        userId,
        conversationId: room,
      });

      // ALSO emit to specific participants' user rooms to ensure they ring even if not in the conversation view
      if (conversation.participants) {
        conversation.participants.forEach((participant: any) => {
          let participantId = participant.toString();
          if (participant._id) participantId = participant._id.toString();

          if (participantId !== userId) {
            this.server.to(participantId).emit('call_made', {
              offer: payload.offer,
              socket: client.id,
              userId,
              conversationId: room,
            });
            this.logger.debug(`Signaling call to user ${participantId}`);
          }
        });
      }

    } catch (err: any) {
      this.logger.warn(`call_user rejected for ${client.id}: ${err?.message || err}`);
      client.emit('error', err?.message || 'Call not permitted');
    }
  }

  @SubscribeMessage('make_answer')
  handleMakeAnswer(client: Socket, payload: { to: string; answer: any }) {
    this.logger.debug(`Call answered by ${client.id} to ${payload.to}`);
    this.server.to(payload.to).emit('answer_made', {
      answer: payload.answer,
      socket: client.id,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(client: Socket, payload: { to: string; candidate: any }) {
    this.logger.debug(`ICE candidate from ${client.id} to ${payload.to}`);
    this.server.to(payload.to).emit('ice_candidate_received', {
      candidate: payload.candidate,
      socket: client.id,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('end_call')
  handleEndCall(client: Socket, payload: { conversationId: string }) {
    const room = payload?.conversationId;
    if (!room) {
      this.logger.warn(`end_call received without conversationId from ${client.id}`);
      return;
    }

    this.logger.debug(`Call ended in conversation ${room} by ${client.id}`);

    // Notify everyone in the room, including the sender, so both sides stop cleanly
    this.server.to(room).emit('call_ended', {
      userId: client.data.userId,
      socket: client.id,
    });

    // Also try to notify participants directly if they are not in the room
    // (Optimization: can implement similar loop as call_user if needed, but end_call is usually less critical if room broadcast works)

    // Ensure the sender leaves the room to avoid lingering signal traffic
    client.leave(room);
  }

  @SubscribeMessage('decline_call')
  handleDeclineCall(client: Socket, payload: { conversationId: string }) {
    const room = payload?.conversationId;
    if (!room) {
      this.logger.warn(`decline_call received without conversationId from ${client.id}`);
      return;
    }

    this.logger.debug(`Call declined in conversation ${room} by ${client.id}`);

    this.server.to(room).emit('call_declined', {
      userId: client.data.userId,
      socket: client.id,
    });

    // Leave the room on decline as well
    client.leave(room);
  }
}
