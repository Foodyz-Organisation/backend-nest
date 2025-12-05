// src/follows/schemas/follow.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowDocument = Follow & Document;

@Schema({ timestamps: true })
export class Follow {
  _id?: Types.ObjectId;

  // The entity (UserAccount or ProfessionalAccount) that is doing the following
  // Uses refPath for polymorphic reference
  @Prop({ type: Types.ObjectId, refPath: 'followerModel', required: true })
  followerId: Types.ObjectId;

  // The model name for the follower, determines which collection followerId refers to
  @Prop({ type: String, enum: ['UserAccount', 'ProfessionalAccount'], required: true })
  followerModel: string;

  // The entity (UserAccount or ProfessionalAccount) that is being followed
  // Uses refPath for polymorphic reference
  @Prop({ type: Types.ObjectId, refPath: 'followingModel', required: true })
  followingId: Types.ObjectId;

  // The model name for the followed account, determines which collection followingId refers to
  @Prop({ type: String, enum: ['UserAccount', 'ProfessionalAccount'], required: true })
  followingModel: string;

  createdAt: Date;
  updatedAt: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);

// Add a compound unique index to prevent duplicate follow relationships
// A user/professional can only follow another user/professional once.
FollowSchema.index(
  {
    followerId: 1,
    followerModel: 1,
    followingId: 1,
    followingModel: 1,
  },
  { unique: true }
);
