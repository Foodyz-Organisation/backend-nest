// src/follows/follows.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Follow, FollowDocument } from './schemas/follow.schema';
import { UserAccount, UserDocument } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalDocument } from '../professionalaccount/schema/professionalaccount.schema';

// Define a type for the standardized profile information we want to return
type AccountProfile = {
  id: string;
  type: 'UserAccount' | 'ProfessionalAccount';
  username?: string; // Only for UserAccount
  fullName?: string;
  profilePictureUrl?: string;
  followerCount?: number;
  followingCount?: number;
  email?: string; // Only for ProfessionalAccount (or UserAccount, but let's keep consistent)
  // Add other common fields if needed
};

// Define allowed account types for reusability
type AccountType = 'UserAccount' | 'ProfessionalAccount';

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(Follow.name) private readonly followModel: Model<FollowDocument>,
    @InjectModel(UserAccount.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProfessionalAccount.name) private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}


    async follow(
    followerId: Types.ObjectId,
    followerModel: 'UserAccount' | 'ProfessionalAccount',
    followingId: Types.ObjectId,
    followingModel: 'UserAccount' | 'ProfessionalAccount',
  ): Promise<FollowDocument> {
    // 1. Prevent self-follow
    if (followerId.equals(followingId) && followerModel === followingModel) {
      throw new BadRequestException('Cannot follow yourself.');
    }

    // 2. Check if already following to prevent duplicates
    const existingFollow = await this.followModel.findOne({
      followerId,
      followerModel,
      followingId,
      followingModel,
    });
    if (existingFollow) {
      throw new ConflictException('You are already following this account.');
    }

    // 3. Create the new follow record
    const newFollow = await this.followModel.create({
      followerId,
      followerModel,
      followingId,
      followingModel,
    });

    // 4. Update follower/following counts on the respective accounts
    // Update follower's followingCount
    if (followerModel === 'UserAccount') {
      await this.userModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }).exec();
    } else { // ProfessionalAccount
      await this.professionalModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }).exec();
    }

    // Update followed's followerCount
    if (followingModel === 'UserAccount') {
      await this.userModel.findByIdAndUpdate(followingId, { $inc: { followerCount: 1 } }).exec();
    } else { // ProfessionalAccount
      await this.professionalModel.findByIdAndUpdate(followingId, { $inc: { followerCount: 1 } }).exec();
    }

    return newFollow as FollowDocument;
  }

  /**
   * Removes a follow relationship between two accounts.
   * @param followerId The ID of the account initiating the unfollow.
   * @param followerModel The type of the follower account.
   * @param followingId The ID of the account being unfollowed.
   * @param followingModel The type of the unfollowed account.
   * @throws NotFoundException if the follow relationship does not exist.
   */
  async unfollow(
    followerId: Types.ObjectId,
    followerModel: 'UserAccount' | 'ProfessionalAccount',
    followingId: Types.ObjectId,
    followingModel: 'UserAccount' | 'ProfessionalAccount',
  ): Promise<void> {
    // 1. Find and delete the follow record
    const deletedFollow = await this.followModel.findOneAndDelete({
      followerId,
      followerModel,
      followingId,
      followingModel,
    });

    if (!deletedFollow) {
      throw new NotFoundException('You are not following this account.');
    }

    // 2. Decrement follower/following counts on the respective accounts
    // Decrement follower's followingCount
    if (followerModel === 'UserAccount') {
      await this.userModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }).exec();
    } else { // ProfessionalAccount
      await this.professionalModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }).exec();
    }

    // Decrement followed's followerCount
    if (followingModel === 'UserAccount') {
      await this.userModel.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } }).exec();
    } else { // ProfessionalAccount
      await this.professionalModel.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } }).exec();
    }
  }

  /**
   * Retrieves a list of accounts that a given account is following.
   * @param followerId The ID of the account whose following list is requested.
   * @param followerModel The type of the follower account.
   * @returns An array of objects, each containing the ID and model of a followed account.
   */
  async getFollowingIds(
    followerId: Types.ObjectId,
    followerModel: 'UserAccount' | 'ProfessionalAccount',
  ): Promise<{ id: Types.ObjectId, model: string }[]> {
    const following = await this.followModel.find({ followerId, followerModel })
      .select('followingId followingModel -_id') // Select only the IDs and models of who is being followed
      .exec();

    // Map to a cleaner format expected by PostsService
    return following.map(f => ({ id: f.followingId as Types.ObjectId, model: f.followingModel }));
  }

  /**
   * Checks if a specific follower is following a specific account.
   * @param followerId The ID of the potential follower.
   * @param followerModel The model type of the potential follower.
   * @param targetId The ID of the account being checked for.
   * @param targetModel The model type of the account being checked for.
   * @returns True if following, false otherwise.
   */
  async isFollowing(
    followerId: Types.ObjectId,
    followerModel: 'UserAccount' | 'ProfessionalAccount',
    targetId: Types.ObjectId,
    targetModel: 'UserAccount' | 'ProfessionalAccount',
  ): Promise<boolean> {
    const followRecord = await this.followModel.findOne({
      followerId,
      followerModel,
      followingId: targetId,
      followingModel: targetModel,
    }).exec();
    return !!followRecord;
  }

  // ... (Your existing follow, unfollow, getFollowingIds, isFollowing methods) ...
  // Keep the previous methods as they are. This section just adds new ones.

  /**
   * Private helper method to fetch and normalize account profile details.
   * Handles polymorphic accounts (UserAccount or ProfessionalAccount).
   * @param accountId The ID of the account.
   * @param accountModel The model type of the account.
   * @returns A standardized AccountProfile object or null if not found.
   */
  private async _getAccountProfile(
    accountId: Types.ObjectId,
    accountModel: AccountType,
  ): Promise<AccountProfile | null> {
    if (!accountId || !accountModel) {
      return null;
    }

    let account: UserDocument | ProfessionalDocument | null;
    let profile: AccountProfile;

    const selectFields = '_id username fullName profilePictureUrl followerCount followingCount email professionalData.fullName professionalData.profilePictureUrl';

    if (accountModel === 'UserAccount') {
      account = await this.userModel.findById(accountId).select(selectFields).exec();
      if (!account) return null;

      profile = {
        id: account._id!.toHexString(),
        type: 'UserAccount',
        username: account.username,
        fullName: (account as UserDocument).fullName, // Type assertion for specific fields
        profilePictureUrl: account.profilePictureUrl,
        followerCount: account.followerCount,
        followingCount: account.followingCount,
        email: account.email // Assuming UserAccount also has an email field
      };
    } else if (accountModel === 'ProfessionalAccount') {
      account = await this.professionalModel.findById(accountId).select(selectFields).exec();
      if (!account) return null;

      profile = {
        id: account._id!.toHexString(),
        type: 'ProfessionalAccount',
        fullName: (account as ProfessionalDocument).professionalData?.fullName || '', // Nested fullName
        profilePictureUrl: account.profilePictureUrl, // Directly on ProfessionalAccount
        followerCount: account.followerCount,
        followingCount: account.followingCount,
        email: account.email
      };
    } else {
      return null; // Should not happen with strong typing
    }

    return profile;
  }

  /**
   * Retrieves a detailed list of accounts that a given account is following.
   * @param viewerId The ID of the account whose following list is requested.
   * @param viewerModel The type of the viewer account.
   * @returns An array of detailed AccountProfile objects.
   */
  async getDetailedFollowing(
    viewerId: Types.ObjectId,
    viewerModel: AccountType,
  ): Promise<AccountProfile[]> {
    const followRecords = await this.followModel.find({ followerId: viewerId, followerModel: viewerModel })
      .select('followingId followingModel -_id')
      .exec();

    const detailedProfilesPromises = followRecords.map(async (record) =>
      this._getAccountProfile(record.followingId, record.followingModel as AccountType),
    );

    const detailedProfiles = await Promise.all(detailedProfilesPromises);
    // Filter out any null profiles (e.g., if a followed account was deleted)
    return detailedProfiles.filter((profile) => profile !== null) as AccountProfile[];
  }

  /**
   * Retrieves a detailed list of accounts that are following a given account.
   * @param targetId The ID of the account whose followers list is requested.
   * @param targetModel The type of the target account.
   * @returns An array of detailed AccountProfile objects.
   */
  async getDetailedFollowers(
    targetId: Types.ObjectId,
    targetModel: AccountType,
  ): Promise<AccountProfile[]> {
    const followRecords = await this.followModel.find({ followingId: targetId, followingModel: targetModel })
      .select('followerId followerModel -_id')
      .exec();

    const detailedProfilesPromises = followRecords.map(async (record) =>
      this._getAccountProfile(record.followerId, record.followerModel as AccountType),
    );

    const detailedProfiles = await Promise.all(detailedProfilesPromises);
    // Filter out any null profiles
    return detailedProfiles.filter((profile) => profile !== null) as AccountProfile[];
  }
}
