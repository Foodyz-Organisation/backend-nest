import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserAccount } from '../../useraccount/schema/useraccount.schema'; // Adjust path
import { Post } from './post.schema';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
  @Prop({ type: Types.ObjectId, ref: 'UserAccount', required: true })
  userId: Types.ObjectId; // The user who liked the post

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId; // The post that was liked
}

export const LikeSchema = SchemaFactory.createForClass(Like);
