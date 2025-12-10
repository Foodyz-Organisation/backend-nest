import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schema/menuitem.schema';
import { CreateMenuItemDto } from './dto/create-menuitem.dto';
import { UpdateMenuItemDto } from './dto/update-menuitem.dto';
import { Category } from './schema/menu-category.enum';
import { IntensityType } from './schema/intensity-type.enum';
import { getDefaultIntensityColor } from './schema/intensity-config';

type MenuByCategory = {
  [key in Category]?: MenuItem[];
};

@Injectable()
export class MenuItemService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  // 1. CREATE
  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    // Auto-set intensity color if type is provided but color is not
    if (createMenuItemDto.ingredients) {
      createMenuItemDto.ingredients = createMenuItemDto.ingredients.map(ingredient => {
        if (ingredient.supportsIntensity && ingredient.intensityType && !ingredient.intensityColor) {
          ingredient.intensityColor = getDefaultIntensityColor(ingredient.intensityType);
        }
        return ingredient;
      });
    }
    const createdItem = new this.menuItemModel(createMenuItemDto);
    return createdItem.save();
  }

  // 2. FIND ALL BY PROFESSIONAL ID
  async findAllByProfessionalId(professionalId: string): Promise<MenuItem[]> {
    return this.menuItemModel.find({ professionalId }).exec();
  }

  // ⭐️ 3. FIND ONE (New Method for Edit Screen)
  async findOne(id: string): Promise<MenuItem> {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Menu item with ID #${id} not found`);
    }
    return item;
  }

  // 4. UPDATE
  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    // Auto-set intensity color if type is provided but color is not
    if (updateMenuItemDto.ingredients) {
      updateMenuItemDto.ingredients = updateMenuItemDto.ingredients.map(ingredient => {
        if (ingredient.supportsIntensity && ingredient.intensityType && !ingredient.intensityColor) {
          ingredient.intensityColor = getDefaultIntensityColor(ingredient.intensityType);
        }
        return ingredient;
      });
    }
    const updatedItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateMenuItemDto, { new: true })
      .exec();
    if (!updatedItem) {
      throw new NotFoundException(`Menu item with ID #${id} not found`);
    }
    return updatedItem;
  }

  // 5. DELETE
  async delete(id: string): Promise<MenuItem> {
    const deletedItem = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!deletedItem) {
      throw new NotFoundException(`Menu item with ID #${id} not found`);
    }
    return deletedItem;
  }

  // HELPER: Group Items by Category
  groupItemsByCategory(items: MenuItem[]): MenuByCategory {
    return items.reduce((acc, item) => {
      const category = item.category as Category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as MenuByCategory);
  }
}