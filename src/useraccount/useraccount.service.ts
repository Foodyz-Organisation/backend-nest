import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAccount, UserDocument } from './schema/useraccount.schema';
import { CreateUserDto } from './dto/create-useraccount.dto';
import { UpdateUserDto } from './dto/update-useraccount.dto';

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
  async findById(id: string): Promise<UserDocument> {
  const user = await this.userModel.findById(id).exec();
  if (!user) throw new NotFoundException('Utilisateur non trouvé');
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
  
}
