import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatManagementService } from './chat-management.service';
import { ChatManagementController } from './chat-management.controller';
import { ChatManagementGateway } from './chat-management.gateway';
import { SpamDetectionService } from './spam-detection.service';
import { Conversation, ConversationSchema } from './schema/conversation.schema';
import { Message, MessageSchema } from './schema/message.schema';
import { UserAccount, UserSchema } from '../useraccount/schema/useraccount.schema';
import {
  ProfessionalAccount,
  ProfessionalSchema,
} from '../professionalaccount/schema/professionalaccount.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
    }),
    // 🔹 Enregistre les modèles Conversation et Message dans Mongoose
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: UserAccount.name, schema: UserSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [ChatManagementController],
  providers: [ChatManagementService, ChatManagementGateway, SpamDetectionService],
  exports: [ChatManagementService],
})
export class ChatManagementModule {}
