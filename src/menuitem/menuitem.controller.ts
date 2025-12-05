import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { MenuItemService } from './menuitem.service';
import { ImageUploadService } from './imageuploadservice';
import { MenuItem } from './schema/menuitem.schema';
import { CreateMenuItemDto } from './dto/create-menuitem.dto';
import { UpdateMenuItemDto } from './dto/update-menuitem.dto';
import { Category } from './schema/menu-category.enum';

type MenuByCategory = {
  [key in Category]?: MenuItem[];
};

@Controller('menu-items')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  // =================================================================
  // 1. POST: Create New Menu Item (with file upload)
  // =================================================================
  @Post()
  @UseInterceptors(FileInterceptor('image', ImageUploadService.getMulterConfig()))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ): Promise<MenuItem> {
    let createMenuItemDto: CreateMenuItemDto;

    try {
      if (!body.createMenuItemDto) {
        throw new BadRequestException('Missing createMenuItemDto field in form-data');
      }
      createMenuItemDto = plainToInstance(
        CreateMenuItemDto,
        JSON.parse(body.createMenuItemDto),
      );
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new BadRequestException('The DTO payload is not valid JSON.');
    }

    if (file) {
      createMenuItemDto.image = `uploads/${file.filename}`;
    } else {
      console.warn('No file received by Multer!');
    }

    return this.menuItemService.create(createMenuItemDto);
  }

  // =================================================================
  // 2. GET (List): Fetch All Items Grouped by Professional ID
  // =================================================================
  @Get('by-professional/:professionalId')
  async findAllGrouped(
    @Param('professionalId') professionalId: string,
  ): Promise<MenuByCategory> {
    const items = await this.menuItemService.findAllByProfessionalId(professionalId);
    return this.menuItemService.groupItemsByCategory(items);
  }

  // =================================================================
  // ⭐️ 3. GET (Detail): Fetch Single Item by ID
  // =================================================================
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MenuItem> {
    return this.menuItemService.findOne(id);
  }

  // =================================================================
  // 4. PUT: Update an Item by ID
  // =================================================================
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateMenuItemDto: UpdateMenuItemDto
  ): Promise<MenuItem> {
    return this.menuItemService.update(id, updateMenuItemDto);
  }

  // =================================================================
  // 5. DELETE: Remove an Item by ID
  // =================================================================
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<MenuItem> {
    return this.menuItemService.delete(id);
  }
}