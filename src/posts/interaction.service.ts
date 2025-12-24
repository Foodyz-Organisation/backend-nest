import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(UserAccount.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async updateUserPreferenceFromInteraction(
    userId: Types.ObjectId,
    postId: Types.ObjectId,
  ): Promise<void> {
    try {
      // 1. Find the post
      const post = await this.postModel.findById(postId).exec();
      if (!post) {
        this.logger.warn(`Post with ID "${postId}" not found for interaction tracking`);
        return;
      }

      // 2. Extract the foodType from the post
      const foodType = post.foodType;
      if (!foodType) {
        this.logger.warn(`Post with ID "${postId}" has no foodType for interaction tracking`);
        return;
      }

      // 3. Find the user
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        this.logger.warn(`User with ID "${userId}" not found for interaction tracking`);
        return;
      }

      // 4. Initialize preferredFoodTypes array if null
      if (!user.preferredFoodTypes) {
        user.preferredFoodTypes = [];
      }

      // 5. Add foodType to preferredFoodTypes if not already present (implicit collection)
      if (!user.preferredFoodTypes.includes(foodType)) {
        user.preferredFoodTypes.push(foodType);
      }

      // 6. Update lastInteractedFoodType
      user.lastInteractedFoodType = foodType;

      // 7. Update lastInteractionTimestamp
      user.lastInteractionTimestamp = new Date();

      // 8. Save the user account
      await user.save();

      this.logger.log(
        `Updated preference for user ${userId}: added/updated foodType "${foodType}"`,
      );
    } catch (error) {
      // Log error but don't throw - this is a background preference update
      // and shouldn't break the main interaction flow
      this.logger.error(
        `Failed to update user preference from interaction (userId: ${userId}, postId: ${postId}):`,
        error,
      );
    }
  }
}

