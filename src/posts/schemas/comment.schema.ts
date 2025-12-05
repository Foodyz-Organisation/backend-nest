// src/posts/schemas/comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Post } from './post.schema';
import * as mongoose from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  _id?: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId; // Changed type to Types.ObjectId for consistency

  // --- NEW: userId to link to the UserAccount who made the comment ---
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserAccount', required: true })
  userId: Types.ObjectId; // The user who made this comment
  // --- END NEW ---

  @Prop({ required: true, maxlength: 500 })
  text: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
