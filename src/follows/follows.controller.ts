// src/follows/follows.controller.ts
import {
  Controller,
  Post,
  Delete,
  Param,
  Headers,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ApiOperation, ApiResponse, ApiTags, ApiHeader } from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { Follow, FollowDocument } from './schemas/follow.schema';


// Define allowed account types
type AccountType = 'UserAccount' | 'ProfessionalAccount';

// Define the response DTO for detailed profiles (optional, but good for Swagger clarity)
class AccountProfileDto {
  id: string;
  type: AccountType;
  username?: string;
  fullName?: string;
  profilePictureUrl?: string;
  followerCount?: number;
  followingCount?: number;
  email?: string;
}

@ApiTags('follows')
@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // ... (Your existing follow, unfollow, getFollowingIds, isFollowing methods) ...
  // Keep these methods as they are. This section just adds new ones.

  /**
   * Endpoint to establish a follow relationship.
   * A follower (identified by x-user-id and x-owner-type) follows a target account.
   */
  @Post(':followingId')
  @ApiOperation({ summary: 'Follow an account' })
  @ApiResponse({ status: 201, description: 'Follow successful', type: Follow })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID format, self-follow)' })
  @ApiResponse({ status: 409, description: 'Already following' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the follower (UserAccount or ProfessionalAccount) (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of the follower (UserAccount or ProfessionalAccount) (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  @ApiHeader({
    name: 'x-following-type',
    description: 'The type of the account being followed (UserAccount or ProfessionalAccount)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async follow(
    @Param('followingId') followingId: string,
    @Headers('x-user-id') followerId: string,
    @Headers('x-owner-type') followerModel: AccountType,
    @Headers('x-following-type') followingModel: AccountType,
  ): Promise<FollowDocument> {
    if (!Types.ObjectId.isValid(followerId) || !Types.ObjectId.isValid(followingId)) {
      throw new BadRequestException('Invalid ID format for follower or following account.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(followerModel) || !['UserAccount', 'ProfessionalAccount'].includes(followingModel)) {
      throw new BadRequestException('Invalid follower or following account type.');
    }

    return this.followsService.follow(
      new Types.ObjectId(followerId),
      followerModel,
      new Types.ObjectId(followingId),
      followingModel,
    );
  }

  /**
   * Endpoint to remove a follow relationship.
   */
  @Delete(':followingId')
  @ApiOperation({ summary: 'Unfollow an account' })
  @ApiResponse({ status: 204, description: 'Unfollow successful (No Content)' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID)' })
  @ApiResponse({ status: 404, description: 'Not following this account' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the follower (UserAccount or ProfessionalAccount) (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of the follower (UserAccount or ProfessionalAccount) (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  @ApiHeader({
    name: 'x-following-type',
    description: 'The type of the account being unfollowed (UserAccount or ProfessionalAccount)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async unfollow(
    @Param('followingId') followingId: string,
    @Headers('x-user-id') followerId: string,
    @Headers('x-owner-type') followerModel: AccountType,
    @Headers('x-following-type') followingModel: AccountType,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(followerId) || !Types.ObjectId.isValid(followingId)) {
      throw new BadRequestException('Invalid ID format for follower or following account.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(followerModel) || !['UserAccount', 'ProfessionalAccount'].includes(followingModel)) {
      throw new BadRequestException('Invalid follower or following account type.');
    }

    await this.followsService.unfollow(
      new Types.ObjectId(followerId),
      followerModel,
      new Types.ObjectId(followingId),
      followingModel,
    );
  }

  /**
   * Endpoint to get a list of IDs and types of accounts the current user is following.
   */
  @Get('following-ids') // Renamed for clarity to avoid conflict with /following-details
  @ApiOperation({ summary: 'Get IDs of accounts the current user is following' })
  @ApiResponse({ status: 200, description: 'List of followed accounts IDs and types', type: [Object] })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user/professional whose following list is requested (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of the user/professional whose following list is requested (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async getFollowingIds(
    @Headers('x-user-id') followerId: string,
    @Headers('x-owner-type') followerModel: AccountType,
  ): Promise<{ id: Types.ObjectId, model: string }[]> {
    if (!Types.ObjectId.isValid(followerId)) {
      throw new BadRequestException('Invalid follower ID format.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(followerModel)) {
      throw new BadRequestException('Invalid follower account type.');
    }
    return this.followsService.getFollowingIds(new Types.ObjectId(followerId), followerModel);
  }

  /**
   * Endpoint to check if a specific follower is following a target account.
   */
  @Get('is-following/:targetId')
  @ApiOperation({ summary: 'Check if current user is following a target account' })
  @ApiResponse({ status: 200, description: 'Boolean indicating follow status' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the potential follower (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of the potential follower (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  @ApiHeader({
    name: 'x-target-type',
    description: 'The type of the account being checked (UserAccount or ProfessionalAccount)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async isFollowing(
    @Param('targetId') targetId: string,
    @Headers('x-user-id') followerId: string,
    @Headers('x-owner-type') followerModel: AccountType,
    @Headers('x-target-type') targetModel: AccountType,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(followerId) || !Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Invalid ID format for follower or target account.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(followerModel) || !['UserAccount', 'ProfessionalAccount'].includes(targetModel)) {
      throw new BadRequestException('Invalid follower or target account type.');
    }
    return this.followsService.isFollowing(
      new Types.ObjectId(followerId),
      followerModel,
      new Types.ObjectId(targetId),
      targetModel,
    );
  }


  // --- NEW: Detailed Following List Endpoint ---
  @Get('following-details')
  @ApiOperation({ summary: 'Get detailed profiles of accounts the current user is following' })
  @ApiResponse({ status: 200, description: 'List of detailed followed account profiles', type: [AccountProfileDto] })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'The ID of the user/professional whose following list is requested (temporary)',
    required: true,
  })
  @ApiHeader({
    name: 'x-owner-type',
    description: 'The type of the user/professional whose following list is requested (temporary)',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async getDetailedFollowing(
    @Headers('x-user-id') viewerId: string,
    @Headers('x-owner-type') viewerModel: AccountType,
  ): Promise<AccountProfileDto[]> {
    if (!Types.ObjectId.isValid(viewerId)) {
      throw new BadRequestException('Invalid viewer ID format.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(viewerModel)) {
      throw new BadRequestException('Invalid viewer account type.');
    }
    return this.followsService.getDetailedFollowing(new Types.ObjectId(viewerId), viewerModel);
  }

  // --- NEW: Detailed Followers List Endpoint ---
  @Get('followers-details/:targetId') // Pass targetId in path, headers identify the viewer checking
  @ApiOperation({ summary: 'Get detailed profiles of accounts following a target account' })
  @ApiResponse({ status: 200, description: 'List of detailed follower account profiles', type: [AccountProfileDto] })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., invalid ID)' })
  @ApiHeader({
    name: 'x-user-id', // Optional, if you want to know *who* is asking for this list (e.g., for permissions)
    description: 'The ID of the user/professional requesting this list (optional, temporary)',
    required: false, // Make this optional if anyone can view followers
  })
  @ApiHeader({
    name: 'x-owner-type', // Optional
    description: 'The type of the user/professional requesting this list (optional, temporary)',
    required: false,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  @ApiHeader({ // This header is required to know the *type* of the targetId
    name: 'x-target-type',
    description: 'The type of the account (UserAccount or ProfessionalAccount) whose followers are being requested',
    required: true,
    enum: ['UserAccount', 'ProfessionalAccount'],
  })
  async getDetailedFollowers(
    @Param('targetId') targetId: string,
    @Headers('x-target-type') targetModel: AccountType,
    // Add these back if you need to know who is requesting the list for permissions etc.
    // @Headers('x-user-id') viewerId?: string,
    // @Headers('x-owner-type') viewerModel?: AccountType,
  ): Promise<AccountProfileDto[]> {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Invalid target ID format.');
    }
    if (!['UserAccount', 'ProfessionalAccount'].includes(targetModel)) {
      throw new BadRequestException('Invalid target account type.');
    }
    return this.followsService.getDetailedFollowers(new Types.ObjectId(targetId), targetModel);
  }
}
