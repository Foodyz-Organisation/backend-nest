import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { UsersService } from './useraccount.service';
import { CreateUserDto } from './dto/create-useraccount.dto';
import { UpdateUserDto } from './dto/update-useraccount.dto';
import { FileInterceptor } from '@nestjs/platform-express'; // Import FileInterceptor
import { ImageUploadService } from 'src/menuitem/imageuploadservice'; // ⭐ Adjust this import path ⭐


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('/email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
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