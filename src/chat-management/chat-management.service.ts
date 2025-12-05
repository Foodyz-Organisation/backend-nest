import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schema/conversation.schema';
import { Message, MessageDocument } from './schema/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import {
  ProfessionalAccount,
  ProfessionalDocument,
} from '../professionalaccount/schema/professionalaccount.schema';

type SendMessagePayload = {
  conversationId: string;
  senderId: string;
  isSpam?: boolean;
  spamConfidence?: number;
  hasBadWords?: boolean;
  moderatedContent?: string;
} & SendMessageDto;

@Injectable()
export class ChatManagementService {
  constructor(
    @InjectModel(Conversation.name) private convModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private msgModel: Model<MessageDocument>,
    @InjectModel(UserAccount.name) private userModel: Model<UserDocument>,
    @InjectModel(ProfessionalAccount.name)
    private profModel: Model<ProfessionalDocument>,
  ) {}

  async getChatsForUser(userId: string) {
    const userObjectId = this.ensureObjectId(userId);

    const conversations = await this.convModel
      .find({ participants: userObjectId })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const allOtherParticipantIds = new Set<string>();
    conversations.forEach((conv: any) => {
      (conv.participants || []).forEach((participantId: Types.ObjectId) => {
        const id = participantId?.toString();
        if (id && id !== userObjectId.toString()) {
          allOtherParticipantIds.add(id);
        }
      });
    });

    const idsToResolve = Array.from(allOtherParticipantIds);
    const [users, professionals] = await Promise.all([
      idsToResolve.length
        ? this.userModel.find({ _id: { $in: idsToResolve } }).lean().exec()
        : [],
      idsToResolve.length
        ? this.profModel.find({ _id: { $in: idsToResolve } }).lean().exec()
        : [],
    ]);

    const participantNames = new Map<string, string>();
    users.forEach((user: any) => {
      participantNames.set(user._id.toString(), user.username || user.email || 'User');
    });
    professionals.forEach((prof: any) => {
      participantNames.set(
        prof._id.toString(),
        prof.professionalData?.fullName || prof.email || 'Professional',
      );
    });

    const chats = await Promise.all(
      conversations.map(async (conv: any) => {
        const lastMessage = await this.msgModel
          .findOne({ conversation: conv._id })
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        const otherIds = (conv.participants || [])
          .map((participantId: Types.ObjectId) => participantId?.toString())
          .filter((id: string | undefined) => id && id !== userObjectId.toString()) as string[];

        const displayName =
          (conv.title || '').trim() ||
          otherIds.map((id) => participantNames.get(id)).filter(Boolean).join(', ') ||
          'Conversation';

        return {
          id: conv._id.toString(),
          name: displayName,
          message: lastMessage?.content || 'No message yet',
          time:
            lastMessage?.createdAt?.toISOString?.() ||
            conv.updatedAt?.toISOString?.() ||
            new Date().toISOString(),
          unreadCount: 0,
          online: false,
        };
      }),
    );

    return chats;
  }

  async createConversation(dto: CreateConversationDto, creatorId: string) {
    const participants = this.normalizeParticipants(dto.participants, creatorId);

    if (dto.kind === 'private' && participants.length !== 2) {
      throw new BadRequestException('A private conversation must have exactly two participants');
    }

    if (dto.kind === 'private') {
      const existing = await this.convModel
        .findOne({
          kind: 'private',
          participants: { $all: participants },
          $expr: { $eq: [{ $size: '$participants' }, 2] },
        })
        .exec();

      if (existing) {
        return existing;
      }
    }

    const conv = new this.convModel({
      kind: dto.kind,
      participants,
      title: dto.title?.trim() || '',
      meta: dto.meta || {},
    });

    return conv.save();
  }

  async getConversationsForUser(userId: string) {
    const userObjectId = this.ensureObjectId(userId);
    return this.convModel
      .find({ participants: userObjectId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getConversationForUser(id: string, userId: string) {
    const conversation = await this.convModel.findById(id).exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    this.assertParticipant(conversation, userId);
    return conversation;
  }

  async sendMessage(payload: SendMessagePayload) {
    const { conversationId, senderId, content, type, meta, isSpam, spamConfidence, hasBadWords, moderatedContent } = payload;
    const conversation = await this.convModel.findById(conversationId).exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const senderObjectId = this.ensureObjectId(senderId);
    this.assertParticipant(conversation, senderObjectId);

    const message = new this.msgModel({
      conversation: conversation._id,
      sender: senderObjectId,
      content,
      type: type || 'text',
      meta: meta || {},
      isSpam: isSpam || false,
      spamConfidence: spamConfidence || 0,
      hasBadWords: hasBadWords || false,
      moderatedContent: moderatedContent || content,
    });

    const saved = await message.save();
    conversation.updatedAt = new Date();
    await conversation.save();

    return saved;
  }

  async getMessagesForUser(conversationId: string, userId: string, limit = 50, before?: Date) {
    const conversation = await this.getConversationForUser(conversationId, userId);
    const query: Record<string, any> = { conversation: conversation._id };

    if (before) {
      query.createdAt = { $lt: before };
    }

    return this.msgModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async addParticipant(conversationId: string, userId: string) {
    const conversation = await this.convModel.findById(conversationId).exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const userObjectId = this.ensureObjectId(userId);
    this.assertParticipant(conversation, userObjectId, { allowMissing: true });

    return this.convModel.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: userObjectId } },
      { new: true },
    );
  }

  async listPeers(currentUserId: string) {
    const currentObjectId = this.ensureObjectId(currentUserId);

    const [users, professionals] = await Promise.all([
      this.userModel
        .find({ _id: { $ne: currentObjectId } })
        .select(['username', 'email', 'role', 'avatarUrl'])
        .lean()
        .exec(),
      this.profModel
        .find({ _id: { $ne: currentObjectId } })
        .select(['email', 'role', 'professionalData.fullName', 'professionalData.avatarUrl'])
        .lean()
        .exec(),
    ]);

    return [
      ...users.map((user) => ({
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role || 'user',
        kind: 'user',
        avatarUrl: user.avatarUrl || '',
      })),
      ...professionals.map((prof) => ({
        id: prof._id,
        name: prof.professionalData?.fullName || prof.email,
        email: prof.email,
        role: prof.role || 'professional',
        kind: 'professional',
        avatarUrl: prof.professionalData?.avatarUrl || '',
      })),
    ];
  }

  private normalizeParticipants(participants: string[], creatorId: string) {
    const ids = [...(participants || []), creatorId].filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length < 2) {
      throw new BadRequestException('A conversation requires at least two distinct participants');
    }

    return uniqueIds.map((id) => this.ensureObjectId(id));
  }

  private ensureObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid identifier supplied');
    }
    return new Types.ObjectId(id);
  }

  private assertParticipant(
    conversation: ConversationDocument,
    user: Types.ObjectId | string,
    options: { allowMissing?: boolean } = {},
  ) {
    const userObjectId = user instanceof Types.ObjectId ? user : this.ensureObjectId(user);
    const isParticipant = conversation.participants.some((participant: any) => {
      if (participant instanceof Types.ObjectId) {
        return participant.equals(userObjectId);
      }
      if (participant?._id) {
        return participant._id.equals(userObjectId);
      }
      return participant?.toString() === userObjectId.toString();
    });

    if (!isParticipant) {
      if (options.allowMissing) {
        return;
      }
      throw new ForbiddenException('You are not allowed to access this conversation');
    }
  }
}
