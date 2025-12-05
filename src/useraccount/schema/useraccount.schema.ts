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
  
  @Prop({ default: null })
  profilePictureUrl: string;

  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpiry?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  avatarUrl?: string;

  // ✅ NOUVEAU : Système de points de fidélité
  @Prop({ default: 0 })
  loyaltyPoints: number;

  @Prop({ default: 0 })
  validReclamationsCount: number;

  @Prop({ default: 0 })
  invalidReclamationsCount: number;

  @Prop({ default: 100 }) // Score de fiabilité sur 100
  reliabilityScore: number;

  @Prop({ type: [{ 
    points: Number, 
    reason: String, 
    reclamationId: String, 
    date: Date 
  }], default: [] })
  pointsHistory: Array<{
    points: number;
    reason: string;
    reclamationId: string;
    date: Date;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(UserAccount);