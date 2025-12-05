import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAccount, UserDocument } from './schema/useraccount.schema';
import { CreateUserDto } from './dto/create-useraccount.dto';
import { UpdateUserDto } from './dto/update-useraccount.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto'; // <-- NEW IMPORT
import { Post, PostDocument } from '../posts/schemas/post.schema'; // <-- NEW IMPORT (adjust path if needed)

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserAccount.name) private userModel: Model<UserDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>, // Inject Post model
  ) {}

  // Create user
  async create(createUserDto: CreateUserDto): Promise<UserAccount> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  // Find all users
  async findAll(): Promise<UserAccount[]> {
    return this.userModel.find().exec();
  }

  // Find one user by ID
  async findOne(id: string): Promise<UserAccount> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Find user by email
  async findByEmail(email: string): Promise<UserAccount> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Update user
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserAccount> {
    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
    if (!updatedUser) throw new NotFoundException('User not found');
    return updatedUser;
  }

  // Delete user
  async toggleActive(id: string): Promise<UserAccount> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
  
    user.isActive = !user.isActive; // toggle the boolean
    return user.save();
  }
  
  /**
   * Retrieves a comprehensive profile for a given user.
   * Includes user details and post count.
   * @param userId The ID of the user whose profile to retrieve.
   * @returns A UserProfileResponseDto containing the user's profile information.
   * @throws NotFoundException if the user does not exist.
   */
  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    // Count posts for this user
    const postCount = await this.postModel.countDocuments({ userId: user._id }).exec();

    // Construct the response DTO
    // We explicitly map fields to ensure we control what is returned
    const userProfile: UserProfileResponseDto = {
      _id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      profilePictureUrl: user.profilePictureUrl,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      postCount: postCount,
      // You can decide which other fields to include/exclude for a public profile
      phone: user.phone, // Include if desired, or omit for public profiles
      address: user.address, // Include if desired
      email: user.email, // Include if desired
      isActive: user.isActive,
      // Note: password should NEVER be returned
    };

    return userProfile;
  }


}
