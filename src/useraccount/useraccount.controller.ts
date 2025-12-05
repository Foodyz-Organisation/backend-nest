// src/user/user.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { UsersService } from './useraccount.service';
import { CreateUserDto } from './dto/create-useraccount.dto';
import { UpdateUserDto } from './dto/update-useraccount.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto'; // <-- NEW IMPORT
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'; // <-- NEW IMPORTS for Swagger
import { Types } from 'mongoose'; // <-- NEW IMPORT for ObjectId validation
import { FileInterceptor } from '@nestjs/platform-express'; // Import FileInterceptor
import { ImageUploadService } from 'src/menuitem/imageuploadservice'; // ⭐ Adjust this import path ⭐


@ApiTags('users') // Group endpoints under 'users' tag in Swagger
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

    // 1. Construct the path/URL saved in the database
    // This assumes your static assets are served from /uploads
    const relativePath = `/uploads/${file.filename}`;

    // 2. Call the new service method to update the profilePictureUrl field
    const updatedUser = await this.usersService.updateProfilePicture(
      id,
      relativePath,
    );

    return {
      message: 'Profile image updated successfully.',
      profilePictureUrl: relativePath,
      user: updatedUser,
    };
  }
}