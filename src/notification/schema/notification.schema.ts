import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  // Order notifications
  ORDER_CREATED = 'order_created',           // User created order → Notify professional
  ORDER_CONFIRMED = 'order_confirmed',       // Professional confirmed order → Notify user
  ORDER_COMPLETED = 'order_completed',       // Professional completed order → Notify user
  ORDER_CANCELLED = 'order_cancelled',       // Order cancelled → Notify both
  ORDER_REFUSED = 'order_refused',          // Professional refused order → Notify user
  PAYMENT_SUCCESS = 'payment_success',       // Payment succeeded → Notify user
  PAYMENT_FAILED = 'payment_failed',        // Payment failed → Notify user
  
  // Event notifications
  EVENT_CREATED = 'event_created',           // Event created → Notify all users or followers
  
  // Post notifications
  POST_CREATED = 'post_created',            // Post created → Notify followers
  POST_LIKED = 'post_liked',                // Post liked → Notify post owner
  POST_COMMENTED = 'post_commented',        // Post commented → Notify post owner
  
  // Deal notifications
  DEAL_CREATED = 'deal_created',            // Deal created → Notify all users or followers
  
  // Reclamation notifications
  RECLAMATION_CREATED = 'reclamation_created',        // Reclamation created → Notify restaurant
  RECLAMATION_UPDATED = 'reclamation_updated',        // Reclamation status updated → Notify user
  RECLAMATION_RESPONDED = 'reclamation_responded',    // Reclamation responded → Notify user
  
  // Chat notifications
  MESSAGE_RECEIVED = 'message_received',     // Message received → Notify recipient
  CONVERSATION_STARTED = 'conversation_started', // New conversation started → Notify participants
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'UserAccount', required: false })
  userId?: Types.ObjectId; // User who receives the notification

  @Prop({ type: Types.ObjectId, ref: 'ProfessionalAccount', required: false })
  professionalId?: Types.ObjectId; // Professional who receives the notification

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType; // Type of notification

  @Prop({ required: true })
  title: string; // Notification title

  @Prop({ required: true })
  message: string; // Notification message

  // Entity references (only one will be populated based on notification type)
  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: false })
  eventId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: false })
  postId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deals', required: false })
  dealId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Reclamation', required: false })
  reclamationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: false })
  messageId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: false })
  conversationId?: Types.ObjectId;

  @Prop({ default: false })
  isRead: boolean; // Whether notification has been read

  @Prop({ type: Object, required: false })
  metadata?: {
    // Additional data for the notification (flexible for all entity types)
    orderStatus?: string;
    totalPrice?: number;
    itemCount?: number;
    eventName?: string;
    eventDate?: string;
    postCaption?: string;
    dealName?: string;
    reclamationStatus?: string;
    senderName?: string;
    messagePreview?: string;
    [key: string]: any;
  };
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
