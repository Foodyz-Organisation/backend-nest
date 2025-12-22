import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schema/menuitem.schema';
import { CreateMenuItemDto } from './dto/create-menuitem.dto';
import { UpdateMenuItemDto } from './dto/update-menuitem.dto';
import { Category } from './schema/menu-category.enum';
import { IntensityType } from './schema/intensity-type.enum';
import { getDefaultIntensityColor } from './schema/intensity-config';
import { Deals, DealsDocument } from '../deals/schemas/deals.schema'; // ⭐ Import

type MenuByCategory = {
  [key in Category]?: MenuItem[];
};

@Injectable()
export class MenuItemService {
  private readonly logger = new Logger(MenuItemService.name);

  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Deals.name) private dealsModel: Model<DealsDocument>, // ⭐ Inject Deals
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

  // ⭐ 2. FIND ALL BY PROFESSIONAL ID - WITH DEALS ENRICHMENT
  async findAllByProfessionalId(professionalId: string): Promise<any[]> {
    const items = await this.menuItemModel.find({ professionalId }).exec();
    
    // Get active deals for this professional
    const now = new Date();
    const activeDeals = await this.dealsModel.find({
      professionalId: new Types.ObjectId(professionalId),
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).exec();

    this.logger.log(`📊 Found ${items.length} items and ${activeDeals.length} active deals for professional ${professionalId}`);

    // Enrich each item with deal information
    return items.map(item => {
      const itemObj = item.toObject();
      
      // Find applicable deal
      const applicableDeal = this.findApplicableDeal(itemObj, activeDeals);

      if (applicableDeal) {
        // Calculate discounted price
        const discountedPrice = itemObj.price * (1 - applicableDeal.discountPercentage / 100);
        
        this.logger.log(`💰 Item "${itemObj.name}": ${itemObj.price} TND → ${discountedPrice.toFixed(2)} TND (-${applicableDeal.discountPercentage}%)`);
        
        return {
          ...itemObj,
          discountedPrice: Number(discountedPrice.toFixed(2)),
          activeDealId: applicableDeal._id.toString(),
          discountPercentage: applicableDeal.discountPercentage
        };
      }

      return itemObj;
    });
  }

  // ⭐ HELPER: Find applicable deal for an item
  private findApplicableDeal(item: any, deals: any[]): any | null {
    return deals.find(deal => {
      // Rule 1: Deal applies to all items (both arrays empty)
      if (deal.applicableMenuItems.length === 0 && deal.applicableCategories.length === 0) {
        this.logger.log(`✅ Deal "${deal.description.substring(0, 30)}..." applies to ALL items`);
        return true;
      }
      
      // Rule 2: Deal applies to this specific item
      if (deal.applicableMenuItems.some((id: any) => id.toString() === item._id.toString())) {
        this.logger.log(`✅ Deal "${deal.description.substring(0, 30)}..." applies to item "${item.name}"`);
        return true;
      }
      
      // Rule 3: Deal applies to this category
      if (deal.applicableCategories.includes(item.category)) {
        this.logger.log(`✅ Deal "${deal.description.substring(0, 30)}..." applies to category "${item.category}"`);
        return true;
      }
      
      return false;
    }) || null;
  }

  // ⭐️ 3. FIND ONE (With deals enrichment)
  async findOne(id: string): Promise<any> {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Menu item with ID #${id} not found`);
    }

    const itemObj = item.toObject();
    
    // Get active deals for this professional
    const now = new Date();
    const activeDeals = await this.dealsModel.find({
      professionalId: item.professionalId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).exec();

    // Find applicable deal
    const applicableDeal = this.findApplicableDeal(itemObj, activeDeals);

    if (applicableDeal) {
      const discountedPrice = itemObj.price * (1 - applicableDeal.discountPercentage / 100);
      
      return {
        ...itemObj,
        discountedPrice: Number(discountedPrice.toFixed(2)),
        activeDealId: applicableDeal._id.toString(),
        discountPercentage: applicableDeal.discountPercentage
      };
    }

    return itemObj;
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

  // ⭐ NEW: Apply deal to menu items (no longer needed as we enrich on-the-fly)
  async applyDealToMenuItems(
    dealId: Types.ObjectId,
    discountPercentage: number,
    professionalId: Types.ObjectId,
    applicableMenuItems?: Types.ObjectId[],
    applicableCategories?: string[],
  ): Promise<void> {
    // This method is kept for backward compatibility but does nothing
    // Deals are now applied on-the-fly when fetching menu items
    this.logger.log(`⚠️ applyDealToMenuItems called but deals are now applied on-the-fly`);
  }

  // ⭐ NEW: Remove deal from menu items (no longer needed)
  async removeDealFromMenuItems(dealId: Types.ObjectId): Promise<void> {
    // This method is kept for backward compatibility but does nothing
    this.logger.log(`⚠️ removeDealFromMenuItems called but deals are now applied on-the-fly`);
  }

  // ⭐ NEW: Get effective price
  getEffectivePrice(menuItem: MenuItem): number {
    return (menuItem as any).discountedPrice ?? menuItem.price;
  }
}