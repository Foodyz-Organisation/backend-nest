import { IsNotEmpty, IsString, IsOptional, IsEnum, IsMongoId, IsObject } from 'class-validator';
import { NotificationType } from '../schema/notification.schema';

export class CreateNotificationDto {
  @IsOptional()
  @IsMongoId()
  userId?: string; // User who receives notification

  @IsOptional()
  @IsMongoId()
  professionalId?: string; // Professional who receives notification

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType; // Type of notification

  @IsString()
  @IsNotEmpty()
  title: string; // Notification title

  @IsString()
  @IsNotEmpty()
  message: string; // Notification message

  @IsOptional()
  @IsMongoId()
  orderId?: string; // Related order ID

  @IsOptional()
  @IsMongoId()
  eventId?: string; // Related event ID

  @IsOptional()
  @IsMongoId()
  postId?: string; // Related post ID

  @IsOptional()
  @IsMongoId()
  dealId?: string; // Related deal ID

  @IsOptional()
  @IsMongoId()
  reclamationId?: string; // Related reclamation ID

  @IsOptional()
  @IsMongoId()
  messageId?: string; // Related message ID

  @IsOptional()
  @IsMongoId()
  conversationId?: string; // Related conversation ID

  @IsOptional()
  @IsObject()
  metadata?: {
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
