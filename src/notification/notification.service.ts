import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schema/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  // -----------------------------
  // CREATE NOTIFICATION
  // -----------------------------
  async create(createDto: CreateNotificationDto): Promise<Notification> {
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

    return notification.save();
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
    // Generate title and message based on type
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
        message = postCaption ? `New post: "${postCaption.substring(0, 50)}${postCaption.length > 50 ? '...' : ''}"` : 'A new post has been shared.';
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
        message = status ? `Your reclamation status has been updated to: ${status}.` : 'Your reclamation status has been updated.';
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
        message = messagePreview 
          ? messagePreview.substring(0, 100)
          : 'You have received a new message.';
        break;
      case NotificationType.CONVERSATION_STARTED:
        title = 'New Conversation Started';
        message = senderName 
          ? `${senderName} started a conversation with you.`
          : 'A new conversation has started.';
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
