import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserAccount } from '../../useraccount/schema/useraccount.schema'; // Adjust path
import { Post } from './post.schema';

export type SaveDocument = Save & Document;

@Schema({ timestamps: true })
export class Save {
  @Prop({ type: Types.ObjectId, ref: 'UserAccount', required: true })
  userId: Types.ObjectId; // The user who saved the post (bookmarked)

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId; // The post that was saved
}

export const SaveSchema = SchemaFactory.createForClass(Save);
