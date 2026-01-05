import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversation: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  // Message types:
  // - 'text': Regular text message
  // - 'image': Image message
  // - 'file': File message
  // - 'post': Shared post message (meta contains post details)
  // - 'shared_post': Shared post message (alias for frontend compatibility)
  @Prop({ type: String, enum: ['text', 'image', 'file', 'post', 'shared_post'], default: 'text' })
  type: string;

  // Meta field usage:
  // For type='post' or 'shared_post', meta must contain:
  // - sharedPostId (string): The MongoDB _id of the shared post
  // - sharedPostCaption (string): The post's caption text
  // - sharedPostImage (string): Relative path to image/thumbnail
  // Optional fields: { postId, postCaption, postMediaUrls, postMediaType, 
  // postFoodType, postThumbnailUrl, postOwner: { id, name, avatarUrl }, price, preparationTime,
  // likeCount, commentCount, saveCount }
  @Prop({ type: Object, default: {} })
  meta?: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  isSpam?: boolean;

  @Prop({ type: Number, default: 0 })
  spamConfidence?: number;

  @Prop({ type: Boolean, default: false })
  hasBadWords?: boolean;

  @Prop({ type: String })
  moderatedContent?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
