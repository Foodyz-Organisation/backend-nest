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
import { SupabaseStorageService } from '../common/services/supabase-storage.service';
import { GeminiService } from '../gemini/gemini.service';
import { CreateMenuItemDto } from './dto/create-menuitem.dto';
import { UpdateMenuItemDto } from './dto/update-menuitem.dto';
import { Category } from './schema/menu-category.enum';
import { IntensityType } from './schema/intensity-type.enum';
import { INTENSITY_CONFIG_MAP } from './schema/intensity-config';

type MenuByCategory = {
  [key in Category]?: MenuItem[];
};

@Controller('menu-items')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MenuItemController {
  constructor(
    private readonly menuItemService: MenuItemService,
    private readonly supabaseStorageService: SupabaseStorageService,
    private readonly geminiService: GeminiService,
  ) { }

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
      const imageUrl = await this.supabaseStorageService.uploadFile(file, 'menu-items');
      createMenuItemDto.image = imageUrl;
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
  // 4. PUT: Update an Item by ID (with image - multipart)
  // ⚠️ IMPORTANT: This route MUST come BEFORE the generic @Put(':id')
  // =================================================================
  @Put(':id/with-image')
  @UseInterceptors(FileInterceptor('image', ImageUploadService.getMulterConfig()))
  async updateWithImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ): Promise<MenuItem> {
    let updateMenuItemDto: UpdateMenuItemDto;
    try {
      if (!body.updateMenuItemDto) {
        throw new BadRequestException('Missing updateMenuItemDto field in form-data');
      }
      updateMenuItemDto = plainToInstance(
        UpdateMenuItemDto,
        JSON.parse(body.updateMenuItemDto),
      );
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new BadRequestException('The DTO payload is not valid JSON.');
    }
    if (file) {
      const imageUrl = await this.supabaseStorageService.uploadFile(file, 'menu-items');
      updateMenuItemDto.image = imageUrl;
    } else {
      throw new BadRequestException('Image file is required for this endpoint');
    }
    return this.menuItemService.update(id, updateMenuItemDto);
  }

  // =================================================================
  // ⭐️ 5. PUT: Update an Item by ID (JSON only, no image) - NEW!
  // ⚠️ IMPORTANT: This route MUST come AFTER @Put(':id/with-image')
  // =================================================================
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    return this.menuItemService.update(id, updateMenuItemDto);
  }

  // =================================================================
  // 6. DELETE: Remove an Item by ID
  // =================================================================
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<MenuItem> {
    return this.menuItemService.delete(id);
  }

  // =================================================================
  // 7. GET: Get Available Intensity Types and Configurations
  // =================================================================
  @Get('intensity-types/config')
  getIntensityTypesConfig(): Record<string, { type: IntensityType; icon: string; defaultColor: string; label: string }> {
    // Return all intensity types with their configurations for frontend
    const config: Record<string, { type: IntensityType; icon: string; defaultColor: string; label: string }> = {};
    Object.values(IntensityType).forEach(type => {
      const typeConfig = INTENSITY_CONFIG_MAP[type];
      config[type] = {
        type,
        icon: typeConfig.icon,
        defaultColor: typeConfig.defaultColor,
        label: typeConfig.label,
      };
    });
    return config;
  }

  // =================================================================
  // 8. GET: Get AI Suggestions for a Menu Item
  // =================================================================
  @Get(':id/suggestions')
  async getSuggestions(@Param('id') id: string) {
    const menuItem = await this.menuItemService.findOne(id);
    return this.geminiService.generateMenuItemSuggestions(menuItem);
  }
}