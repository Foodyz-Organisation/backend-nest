import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfessionalDocument = ProfessionalAccount & Document;

@Schema({ timestamps: true })
export class ProfessionalAccount {

  _id?: Types.ObjectId;
  @Prop({ required: true, unique: true })
  email: string;  // login identifier (same auth system)

  @Prop({ required: true })
  password: string; // hashed password, can be same as UserAccount if linked

  @Prop({ default: 'professional' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false }) // URL to the profile picture
  profilePictureUrl?: string;

  @Prop({ type: Object, default: {} })
  professionalData: {
    fullName?: string;
    licenseNumber?: string;
    ocrVerified?: boolean;
    documents?: { filename: string; path: string }[];
  };

  @Prop({ type: Types.ObjectId, ref: 'UserAccount', required: false })
  linkedUserId?: Types.ObjectId; // optional link to a normal user

    @Prop({ type: Number, default: 0 })
  followerCount: number;

  @Prop({ type: Number, default: 0 })
  followingCount: number;
  
}

export const ProfessionalSchema = SchemaFactory.createForClass(ProfessionalAccount);
