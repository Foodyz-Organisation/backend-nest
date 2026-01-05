import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CommentDocument } from './comment.schema';


export enum MediaType {
  IMAGE = 'image',
  REEL = 'reel',
  CAROUSEL = 'carousel',
}

export enum FoodType {
  // Core Categories
  BURGER = 'BURGER',
  PIZZA = 'PIZZA',
  PASTA = 'PASTA',
  MEXICAN = 'MEXICAN',
  SUSHI = 'SUSHI',
  ASIAN = 'ASIAN',
  INDIAN = 'INDIAN',
  MIDEAST = 'MIDEAST',
  SEAFOOD = 'SEAFOOD',
  CHICKEN = 'CHICKEN',
  SANDWICHES = 'SANDWICHES',
  SOUPS = 'SOUPS',
  
  // Dietary and Flavorclear
  SALAD = 'SALAD',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  HEALTHY = 'HEALTHY',
  GLUTEN_FREE = 'GLUTEN_FREE',
  SPICY = 'SPICY',
  
  // Item Type and Occasion
  BREAKFAST = 'BREAKFAST',
  DESSERT = 'DESSERT',
  DRINKS = 'DRINKS',
  KIDS_MENU = 'KIDS_MENU',
  FAMILY_MEAL = 'FAMILY_MEAL',
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

  @Prop({ type: String, enum: FoodType, required: true })
  foodType: FoodType;

  @Prop({ type: Number, required: false })
  price?: number; // Price in TND (e.g., 30 or 6.9) - displayed as "30TND" or "6.9TND" on frontend

  @Prop({ type: Number, required: false })
  preparationTime?: number; // Preparation time in minutes (e.g., 15) - displayed as "15 minutes" on frontend

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
