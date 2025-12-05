import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CommentDocument } from './comment.schema';


export enum MediaType {
  IMAGE = 'image',
  REEL = 'reel',
  CAROUSEL = 'carousel',
}

@Schema({ timestamps: true })
export class Post {
  _id?: Types.ObjectId;

   // Changed from userId to ownerId (the actual ID of the owner)
  @Prop({ type: Types.ObjectId, required: true })
  ownerId: Types.ObjectId;

  // New field to specify WHICH model (collection) the ownerId refers to
  @Prop({ type: String, required: true, enum: ['UserAccount', 'ProfessionalAccount'] })
  ownerModel: string;

  @Prop({ type: String, trim: true, required: true })
  caption: string; 

  @Prop({ type: [String], required: true, minlength: 1 })
  mediaUrls: string[];

  @Prop({ type: String, enum: MediaType, required: true })
  mediaType: MediaType;

  // --- NEW FIELDS: Interaction Counts ---
  @Prop({ type: Number, default: 0 })
  likeCount: number;

  @Prop({ type: Number, default: 0 })
  commentCount: number;

  @Prop({ type: Number, default: 0 })
  saveCount: number; // For bookmarks

  @Prop({ type: String, required: false }) // Will be generated after video upload
  thumbnailUrl?: string; // URL to a static image preview of the video

  @Prop({ type: Number, default: 0 })
  viewsCount: number; // To track how many times a reel has been viewed

  @Prop({ type: Number, required: false })
  duration?: number; // Video duration in seconds
  @Prop({ type: String, required: false })
  aspectRatio?: string; // e.g., "9:16", useful for frontend to optimize display

  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = Post & Document & {
  comments?: CommentDocument[]; // Optional array of comments
};

export const PostSchema = SchemaFactory.createForClass(Post);
