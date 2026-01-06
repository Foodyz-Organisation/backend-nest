// src/user/user.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, Req, BadRequestException, Query } from '@nestjs/common';
import { UsersService } from './useraccount.service';
import { CreateUserDto } from './dto/create-useraccount.dto';
import { UpdateUserDto } from './dto/update-useraccount.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto'; // <-- NEW IMPORT
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger'; // <-- NEW IMPORTS for Swagger
import { Types } from 'mongoose'; // <-- NEW IMPORT for ObjectId validation
import { FileInterceptor } from '@nestjs/platform-express'; // Import FileInterceptor
import { ImageUploadService } from 'src/menuitem/imageuploadservice';
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { ProfilePictureUploadService } from './profile-picture-upload.service';


@ApiTags('users')// Group endpoints under 'users' tag in Swagger
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (validation errors)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user accounts' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username, fullName or email' })
  @ApiResponse({ status: 200, description: 'List of matching users' })
  search(@Query('q') query: string) {
    if (!query) return [];
    return this.usersService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user account by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('/email/:email')
  @ApiOperation({ summary: 'Get a user account by email' })
  @ApiResponse({ status: 200, description: 'User found by email' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user account by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle active status of a user account' })
  @ApiResponse({ status: 200, description: 'User active status toggled' })
  @ApiResponse({ status: 404, description: 'User not found' })
  toggle(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  // --- NEW PROFILE RETRIEVAL ENDPOINT ---
  @Get(':id/profile') // e.g., GET /users/60c72b2f9b1d8c001c8e4d1a/profile
  @ApiOperation({ summary: 'Retrieve a user\'s public profile data and post count' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: UserProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request (invalid user ID format)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('id') id: string): Promise<UserProfileResponseDto> {
    if (!Types.ObjectId.isValid(id)) { // Validate the ID format
      throw new BadRequestException('Invalid user ID format.');
    }
    return this.usersService.getProfile(id);
  }
  /**
   * @deprecated Use POST /users/:id/profile-picture instead
   * This endpoint is kept for backward compatibility but may go through AI validation.
   */
  @Patch(':id/upload-profile-image')
  @UseInterceptors(
    // 'file' is the key expected in the form-data request body
    FileInterceptor('file', ImageUploadService.getMulterConfig()),
  )
  async uploadProfileImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    // 1. Upload to Supabase Storage
    const imageUrl = await this.supabaseStorageService.uploadFile(file, 'profiles');

    // 2. Call the new service method to update the profilePictureUrl field
    const updatedUser = await this.usersService.updateProfilePicture(
      id,
      imageUrl,
    );

    return {
      message: 'Profile image updated successfully.',
      profilePictureUrl: imageUrl,
      user: updatedUser,
    };
  }

  /**
   * ✅ NEW DEDICATED ENDPOINT: Upload profile picture (NO AI VALIDATION)
   * This endpoint is specifically designed for profile pictures and bypasses
   * any food-related AI validation that might be applied to other uploads.
   * 
   * @param id - User ID
   * @param file - Profile picture file (form-data with key 'profilePicture')
   * @returns Updated user with profilePictureUrl
   */
  @Post(':id/profile-picture')
  @ApiOperation({ 
    summary: 'Upload user profile picture (NO AI validation)',
    description: 'Uploads a profile picture for a user. This endpoint bypasses all AI validation and is specifically designed for profile pictures only.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (max 5MB, images only)'
        },
      },
      required: ['profilePicture'],
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Profile picture uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        profilePictureUrl: { type: 'string' },
        user: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request (invalid file or user ID)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseInterceptors(
    // 'profilePicture' is the key expected in the form-data request body
    FileInterceptor('profilePicture', ProfilePictureUploadService.getMulterConfig()),
  )
  async uploadProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Validate user ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format.');
    }

    if (!file) {
      throw new BadRequestException('Profile picture file is required. Please use the key "profilePicture" in your form-data.');
    }

    // 1. Upload to Supabase Storage using dedicated method (NO AI VALIDATION)
    const imageUrl = await this.supabaseStorageService.uploadProfilePicture(file);

    // 2. Update the user's profilePictureUrl field
    const updatedUser = await this.usersService.updateProfilePicture(id, imageUrl);

    return {
      message: 'Profile picture uploaded successfully.',
      profilePictureUrl: imageUrl,
      user: updatedUser,
    };
  }
}