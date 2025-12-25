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
  @Prop()
  fullName?: string; // will act as business name in the frontend

  @Prop()
  licenseNumber?: string; // Restaurant permit/authorization number

  @Prop()
  licenseImageUrl?: string; // Supabase URL of the restaurant permit image

  @Prop({ type: Object })
  licenseValidation?: {
    isValidated: boolean;
    validatedAt?: Date;
    confidence?: 'high' | 'medium' | 'low';
    extractedText?: string;
    tunisianKeywordsFound?: string[];
    rejectionReason?: string; // If validation failed, store reason
    documentType?: string; // e.g., "Autorisation d'exploitation d'un restaurant"
  };

  @Prop()
  description?: string;

  @Prop()
  address?: string;

  @Prop()
  phone?: string;

  @Prop()
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

  @Prop()
  imageUrl?: string;

  // ===== Documents (temporary as strings) =====
  @Prop({ type: [String], default: [] })
  documents?: string[]; // simple array of file paths for now

  // ===== Roles / Linking =====
  @Prop({ default: 'professional' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  profilePictureUrl?: string;

  @Prop({ type: Object, default: {} })
  professionalData: {
    fullName?: string;
    licenseNumber?: string;
    ocrVerified?: boolean;
    documents?: string[]; // optional copy of paths in professionalData
    avatarUrl?: string;
  };

  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpiry?: Date;

  @Prop({ type: Types.ObjectId, ref: 'UserAccount' })
  linkedUserId?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  followerCount: number;

  @Prop({ type: Number, default: 0 })
  followingCount: number;

  @Prop({
    type: [{
      name: { type: String, required: false },
      address: { type: String, required: false },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    }],
    default: [],
  })
  locations?: {
  name?: string;      // Optional, like "Main Branch"
  address?: string;   // Human-readable address
    lat: number;        // Latitude (required)
    lon: number;        // Longitude (required)
}[];

  @Prop({ required: false })
  fcmToken?: string; // Firebase Cloud Messaging token for push notifications

}

export const ProfessionalSchema = SchemaFactory.createForClass(ProfessionalAccount);
