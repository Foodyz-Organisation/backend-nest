import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfessionalDocument = ProfessionalAccount & Document;

@Schema({ timestamps: true })
export class ProfessionalAccount {

  _id?: Types.ObjectId;
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  // ===== Profile =====
  @Prop({ required: false })
  fullName?: string; // will act as business name in the frontend

  @Prop()
  licenseNumber?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  hours?: string;

@Prop({
  type: {
    delivery: { type: Boolean, default: true },
    takeaway: { type: Boolean, default: true },
    dineIn: { type: Boolean, default: true },
  },
  default: {},
})
services: {
  delivery: boolean;
  takeaway: boolean;
  dineIn: boolean;
};

  @Prop({ required: false })
  imageUrl?: string;

  // ===== Documents =====
  @Prop({
    type: [
      {
        filename: { type: String, required: true },
        path: { type: String, required: true },
        ocrText: { type: String },
        verified: { type: Boolean, default: false }
      }
    ],
    default: []
  })
  documents: {
    filename: string;
    path: string;
    ocrText?: string;
    verified?: boolean;
  }[];

  // ===== Roles / Linking =====
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
