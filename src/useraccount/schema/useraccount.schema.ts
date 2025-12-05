import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = UserAccount & Document;

@Schema({ timestamps: true })
export class UserAccount {

   _id?: Types.ObjectId;

   
  @Prop({ required: true, unique: true })
  username: string;

   @Prop({ required: false, default: '' }) // Full name, e.g., "Mohamed Ali"
  fullName: string;

  @Prop({ required: false, default: '' }) // Short description for the profile
  bio: string;

  @Prop({ required: false }) // URL to the profile picture
  profilePictureUrl?: string;

  // Interaction counts for profile
  @Prop({ type: Number, default: 0 })
  followerCount: number;

  @Prop({ type: Number, default: 0 })
  followingCount: number;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  address: string;
  
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: true }) // active by default
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(UserAccount);
