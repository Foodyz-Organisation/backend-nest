import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationDocument, NotificationType } from './schema/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalDocument } from '../professionalaccount/schema/professionalaccount.schema';
import { initializeFirebase } from '../common/firebase.config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private firebaseInitialized = false;

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(UserAccount.name)
    private userModel: Model<UserDocument>,
    @InjectModel(ProfessionalAccount.name)
    private profModel: Model<ProfessionalDocument>,
    private configService: ConfigService,
  ) {
    // Initialize Firebase on service creation
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const app = initializeFirebase(this.configService);
    if (app) {
      this.firebaseInitialized = true;
      this.logger.log('✅ Firebase initialized for push notifications');
    } else {
      this.firebaseInitialized = false;
      this.logger.log('ℹ️ Firebase not configured. Push notifications will be skipped (notifications will still be saved to database).');
    }
  }

  // -----------------------------
  // CREATE NOTIFICATION (Updated with Push)
  // -----------------------------
  async create(createDto: CreateNotificationDto): Promise<Notification> {
    // 1. Save to Database
    const notification = new this.notificationModel({
      userId: createDto.userId,
      professionalId: createDto.professionalId,
      type: createDto.type,
      title: createDto.title,
      message: createDto.message,
      orderId: createDto.orderId,
      eventId: createDto.eventId,
      postId: createDto.postId,
      dealId: createDto.dealId,
      reclamationId: createDto.reclamationId,
      messageId: createDto.messageId,
      conversationId: createDto.conversationId,
      metadata: createDto.metadata,
      isRead: false,
    });

    const savedNotification = await notification.save();

    // 2. Send Real Push Notification (non-blocking)
    this.sendPushNotification(createDto).catch((error) => {
      this.logger.error(`Failed to send push notification: ${error.message}`);
    });

    return savedNotification;
  }

  // -----------------------------
  // 🔥 SEND PUSH NOTIFICATION
  // -----------------------------
    // -----------------------------
  // 🔥 SEND PUSH NOTIFICATION (DEBUG VERSION)
  // -----------------------------
  private async sendPushNotification(dto: CreateNotificationDto): Promise<void> {
    this.logger.log(`🔍 [DEBUG] Starting sendPushNotification...`);
    this.logger.log(`🔍 [DEBUG] Target: User=${dto.userId} OR Pro=${dto.professionalId}`);

    if (!this.firebaseInitialized) {
      this.logger.debug('⚠️ [DEBUG] Skipping: Firebase not initialized');
      return;
    }

    try {
      let fcmToken: string | undefined;
      let recipientType = 'Unknown';
      let recipientId = '';

      // Find Recipient & Token
      if (dto.userId) {
        recipientType = 'User';
        recipientId = dto.userId;
        this.logger.log(`🔍 [DEBUG] Looking up User: ${recipientId}`);
        const user = await this.userModel.findById(dto.userId).select('fcmToken email username').lean();
        
        if (user) {
             this.logger.log(`🔍 [DEBUG] User Found: ${user.username} (${user.email})`);
             this.logger.log(`🔍 [DEBUG] User FCM Token in DB: ${user.fcmToken ? user.fcmToken.substring(0, 15) + '...' : 'UNDEFINED/NULL'}`);
             fcmToken = user.fcmToken;
        } else {
             this.logger.warn(`⚠️ [DEBUG] User NOT found in DB!`);
        }

      } else if (dto.professionalId) {
        recipientType = 'Professional';
        recipientId = dto.professionalId;
        this.logger.log(`🔍 [DEBUG] Looking up Professional: ${recipientId}`);
        const prof = await this.profModel.findById(dto.professionalId).select('fcmToken email').lean();

        if (prof) {
             this.logger.log(`🔍 [DEBUG] Pro Found: ${prof.email}`);
             this.logger.log(`🔍 [DEBUG] Pro FCM Token in DB: ${prof.fcmToken ? prof.fcmToken.substring(0, 15) + '...' : 'UNDEFINED/NULL'}`);
             fcmToken = prof.fcmToken;
        } else {
             this.logger.warn(`⚠️ [DEBUG] Professional NOT found in DB!`);
        }
      }

      if (!fcmToken) {
        this.logger.error(`❌ [DEBUG] ABORTING: No FCM Token found for ${recipientType} (${recipientId}). Cannot send push.`);
        return;
      }

      // Convert metadata values to strings (Firebase requirement)
      const dataPayload: Record<string, string> = {
        type: dto.type,
        conversationId: dto.conversationId || '',
        orderId: dto.orderId || '',
        messageId: dto.messageId || '',
      };

      // Add metadata fields as strings
      if (dto.metadata) {
        Object.keys(dto.metadata).forEach((key) => {
          dataPayload[key] = String(dto.metadata![key]);
        });
      }

      const payload: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: dto.title,
          body: dto.message,
        },
        data: dataPayload,
        android: {
            priority: 'high',
            notification: {
                channelId: 'default_notification_channel_id',
            }
        }
      };

      this.logger.log(`🚀 [DEBUG] Sending to Firebase Admin...`);
      const response = await admin.messaging().send(payload);
      this.logger.log(`✅ [DEBUG] Firebase Success! Message ID: ${response}`);

    } catch (error) {
      this.logger.error(`❌ [DEBUG] Push Failed Exception: ${error.message}`, error.stack);
    }
  }

  // -----------------------------
  // CREATE ORDER NOTIFICATION (Helper)
  // -----------------------------
  async createOrderNotification(
    type: NotificationType,
    userId?: string,
    professionalId?: string,
    orderId?: string,
    metadata?: any,
  ): Promise<Notification> {
    let title: string;
    let message: string;

    switch (type) {
      case NotificationType.ORDER_CREATED:
        title = 'New Order Received';
        message = 'You have received a new order. Please review and confirm.';
        break;
      case NotificationType.ORDER_CONFIRMED:
        title = 'Order Confirmed';
        message = 'Your order has been confirmed by the restaurant.';
        break;
      case NotificationType.ORDER_COMPLETED:
        title = 'Order Completed';
        message = 'Your order has been completed. Thank you for your order!';
        break;
      case NotificationType.ORDER_CANCELLED:
        title = 'Order Cancelled';
        message = 'Your order has been cancelled.';
        break;
      case NotificationType.ORDER_REFUSED:
        title = 'Order Refused';
        message = 'Your order has been refused by the restaurant.';
        break;
      case NotificationType.PAYMENT_SUCCESS:
        title = 'Payment Successful';
        message = 'Your payment has been processed successfully.';
        break;
      case NotificationType.PAYMENT_FAILED:
        title = 'Payment Failed';
        message = 'Your payment could not be processed. Please try again.';
        break;
      default:
        title = 'Notification';
        message = 'You have a new notification.';
    }

    return this.create({
      userId: userId ? userId : undefined,
      professionalId: professionalId ? professionalId : undefined,
      type,
      title,
      message,
      orderId: orderId ? orderId : undefined,
      metadata,
    });
  }

  // -----------------------------
  // CREATE EVENT NOTIFICATION (Helper)
  // -----------------------------
  async createEventNotification(
    eventId: string,
    eventName: string,
    eventDate?: string,
    userId?: string,
    professionalId?: string,
    metadata?: any,
  ): Promise<Notification> {
    return this.create({
      userId: userId ? userId : undefined,
      professionalId: professionalId ? professionalId : undefined,
      type: NotificationType.EVENT_CREATED,
      title: 'New Event Available',
      message: `A new event "${eventName}" has been created${eventDate ? ` starting ${eventDate}` : ''}. Check it out!`,
      eventId,
      metadata: {
        eventName,
        eventDate,
        ...metadata,
      },
    });
  }

  // -----------------------------
  // CREATE POST NOTIFICATION (Helper)
  // -----------------------------
  async createPostNotification(
    type: NotificationType.POST_CREATED | NotificationType.POST_LIKED | NotificationType.POST_COMMENTED,
    postId: string,
    postCaption?: string,
    ownerId?: string,
    ownerModel?: 'UserAccount' | 'ProfessionalAccount',
    recipientId?: string,
    recipientModel?: 'UserAccount' | 'ProfessionalAccount',
    metadata?: any,
  ): Promise<Notification> {
    let title: string;
    let message: string;

    switch (type) {
      case NotificationType.POST_CREATED:
        title = 'New Post from Your Follow';
        message = postCaption
          ? `New post: "${postCaption.substring(0, 50)}${postCaption.length > 50 ? '...' : ''}"`
          : 'A new post has been shared.';
        break;
      case NotificationType.POST_LIKED:
        title = 'Your Post Was Liked';
        message = 'Someone liked your post!';
        break;
      case NotificationType.POST_COMMENTED:
        title = 'Your Post Has a New Comment';
        message = 'Someone commented on your post!';
        break;
      default:
        title = 'Post Notification';
        message = 'You have a new post-related notification.';
    }

    const createDto: any = {
      type,
      title,
      message,
      postId,
      metadata: {
        postCaption,
        ...metadata,
      },
    };

    // Set recipient based on model type
    if (recipientModel === 'UserAccount') {
      createDto.userId = recipientId;
    } else if (recipientModel === 'ProfessionalAccount') {
      createDto.professionalId = recipientId;
    }

    return this.create(createDto);
  }

  // -----------------------------
  // CREATE DEAL NOTIFICATION (Helper)
  // -----------------------------
  async createDealNotification(
    dealId: string,
    dealName: string,
    restaurantName?: string,
    userId?: string,
    professionalId?: string,
    metadata?: any,
  ): Promise<Notification> {
    return this.create({
      userId: userId ? userId : undefined,
      professionalId: professionalId ? professionalId : undefined,
      type: NotificationType.DEAL_CREATED,
      title: 'New Deal Available',
      message: restaurantName
        ? `Check out the new deal "${dealName}" from ${restaurantName}!`
        : `A new deal "${dealName}" is now available!`,
      dealId,
      metadata: {
        dealName,
        restaurantName,
        ...metadata,
      },
    });
  }

  // -----------------------------
  // CREATE RECLAMATION NOTIFICATION (Helper)
  // -----------------------------
  async createReclamationNotification(
    type: NotificationType.RECLAMATION_CREATED | NotificationType.RECLAMATION_UPDATED | NotificationType.RECLAMATION_RESPONDED,
    reclamationId: string,
    userId?: string,
    professionalId?: string,
    status?: string,
    metadata?: any,
  ): Promise<Notification> {
    let title: string;
    let message: string;

    switch (type) {
      case NotificationType.RECLAMATION_CREATED:
        title = 'New Reclamation Received';
        message = 'You have received a new reclamation. Please review it.';
        break;
      case NotificationType.RECLAMATION_UPDATED:
        title = 'Reclamation Status Updated';
        message = status
          ? `Your reclamation status has been updated to: ${status}.`
          : 'Your reclamation status has been updated.';
        break;
      case NotificationType.RECLAMATION_RESPONDED:
        title = 'Reclamation Response';
        message = 'The restaurant has responded to your reclamation.';
        break;
      default:
        title = 'Reclamation Notification';
        message = 'You have a new reclamation-related notification.';
    }

    return this.create({
      userId: userId ? userId : undefined,
      professionalId: professionalId ? professionalId : undefined,
      type,
      title,
      message,
      reclamationId,
      metadata: {
        reclamationStatus: status,
        ...metadata,
      },
    });
  }

  // -----------------------------
  // CREATE CHAT NOTIFICATION (Helper)
  // -----------------------------
  async createChatNotification(
    type: NotificationType.MESSAGE_RECEIVED | NotificationType.CONVERSATION_STARTED,
    messageId?: string,
    conversationId?: string,
    senderId?: string,
    senderName?: string,
    recipientId?: string,
    recipientModel?: 'UserAccount' | 'ProfessionalAccount',
    messagePreview?: string,
    metadata?: any,
  ): Promise<Notification> {
    let title: string;
    let message: string;

    switch (type) {
      case NotificationType.MESSAGE_RECEIVED:
        title = senderName ? `New Message from ${senderName}` : 'New Message';
        message = messagePreview ? messagePreview.substring(0, 100) : 'You have received a new message.';
        break;
      case NotificationType.CONVERSATION_STARTED:
        title = 'New Conversation Started';
        message = senderName ? `${senderName} started a conversation with you.` : 'A new conversation has started.';
        break;
      default:
        title = 'Chat Notification';
        message = 'You have a new chat notification.';
    }

    const createDto: any = {
      type,
      title,
      message,
      messageId: messageId ? messageId : undefined,
      conversationId: conversationId ? conversationId : undefined,
      metadata: {
        senderName,
        messagePreview,
        ...metadata,
      },
    };

    // Set recipient based on model type
    if (recipientModel === 'UserAccount') {
      createDto.userId = recipientId;
    } else if (recipientModel === 'ProfessionalAccount') {
      createDto.professionalId = recipientId;
    }

    return this.create(createDto);
  }

  // -----------------------------
  // GET NOTIFICATIONS BY USER
  // -----------------------------
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId })
      .populate('orderId', 'totalPrice status orderType')
      .populate('eventId', 'nom description date_debut lieu categorie image')
      .populate('postId', 'caption mediaUrls mediaType foodType ownerId ownerModel')
      .populate('dealId', 'restaurantName description image category startDate endDate')
      .populate('reclamationId', 'nomClient description statut complaintType')
      .populate('messageId', 'content type sender')
      .populate('conversationId', 'participants title kind')
      .sort({ createdAt: -1 })
      .lean();
  }

  // -----------------------------
  // GET NOTIFICATIONS BY PROFESSIONAL
  // -----------------------------
  async getNotificationsByProfessional(professionalId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ professionalId })
      .populate('orderId', 'totalPrice status orderType')
      .populate('eventId', 'nom description date_debut lieu categorie image')
      .populate('postId', 'caption mediaUrls mediaType foodType ownerId ownerModel')
      .populate('dealId', 'restaurantName description image category startDate endDate')
      .populate('reclamationId', 'nomClient description statut complaintType')
      .populate('messageId', 'content type sender')
      .populate('conversationId', 'participants title kind')
      .sort({ createdAt: -1 })
      .lean();
  }

  // -----------------------------
  // GET UNREAD NOTIFICATIONS
  // -----------------------------
  async getUnreadNotifications(userId?: string, professionalId?: string): Promise<Notification[]> {
    const query: any = { isRead: false };
    if (userId) query.userId = userId;
    if (professionalId) query.professionalId = professionalId;

    return this.notificationModel
      .find(query)
      .populate('orderId', 'totalPrice status orderType')
      .populate('eventId', 'nom description date_debut lieu categorie image')
      .populate('postId', 'caption mediaUrls mediaType foodType ownerId ownerModel')
      .populate('dealId', 'restaurantName description image category startDate endDate')
      .populate('reclamationId', 'nomClient description statut complaintType')
      .populate('messageId', 'content type sender')
      .populate('conversationId', 'participants title kind')
      .sort({ createdAt: -1 })
      .lean();
  }

  // -----------------------------
  // MARK AS READ
  // -----------------------------
  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationModel.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.isRead = true;
    return notification.save();
  }

  // -----------------------------
  // MARK ALL AS READ
  // -----------------------------
  async markAllAsRead(userId?: string, professionalId?: string): Promise<{ modifiedCount: number }> {
    const query: any = { isRead: false };
    if (userId) query.userId = userId;
    if (professionalId) query.professionalId = professionalId;

    const result = await this.notificationModel.updateMany(query, { isRead: true });
    return { modifiedCount: result.modifiedCount };
  }

  // -----------------------------
  // DELETE NOTIFICATION
  // -----------------------------
  async delete(notificationId: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(notificationId);
  }

  // -----------------------------
  // DELETE ALL NOTIFICATIONS
  // -----------------------------
  async deleteAll(userId?: string, professionalId?: string): Promise<{ deletedCount: number }> {
    const query: any = {};
    if (userId) query.userId = userId;
    if (professionalId) query.professionalId = professionalId;

    const result = await this.notificationModel.deleteMany(query);
    return { deletedCount: result.deletedCount };
  }
}
