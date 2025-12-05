// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAccount, UserDocument } from './schema/useraccount.schema';
import { CreateUserDto } from './dto/create-useraccount.dto';
import { UpdateUserDto } from './dto/update-useraccount.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(UserAccount.name) private userModel: Model<UserDocument>) {}

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
  const user = await this.userModel.findById(id).exec();
  if (!user) throw new NotFoundException('User not found');

  // Update normal fields
  if (updateUserDto.username !== undefined) user.username = updateUserDto.username;
  if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
  if (updateUserDto.address !== undefined) user.address = updateUserDto.address;
  if (updateUserDto.email !== undefined) user.email = updateUserDto.email;
  if (updateUserDto.isActive !== undefined) user.isActive = updateUserDto.isActive;
  if (updateUserDto.profilePictureUrl !== undefined) user.profilePictureUrl = updateUserDto.profilePictureUrl;

  // Handle password separately: hash it
  if (updateUserDto.password !== undefined) {
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(updateUserDto.password, salt);
  }

  // Save the document (triggers pre-save hooks if any)
  const updatedUser = await user.save();

  return updatedUser;
}

  // Delete user (Toggle active status)
  async toggleActive(id: string): Promise<UserAccount> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
  
    user.isActive = !user.isActive; // toggle the boolean
    return user.save();
  }

async updateProfilePicture(id: string, path: string): Promise<UserAccount> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { profilePictureUrl: path },
      { new: true }
    ).exec();
    if (!updatedUser) throw new NotFoundException('User not found');
    return updatedUser;
  }
}