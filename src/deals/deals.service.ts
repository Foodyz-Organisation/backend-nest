import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Deals, DealsDocument } from './schemas/deals.schema';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    @InjectModel(Deals.name) private dealsModel: Model<DealsDocument>,
    private notificationService: NotificationService,
  ) { }

  async create(createDealDto: CreateDealDto): Promise<Deals> {
    try {
      // ⭐ Log for debugging
      this.logger.log(`🎯 Creating deal for professional: ${createDealDto.professionalId}`);
      this.logger.log(`💰 Discount: ${createDealDto.discountPercentage}%`);
      this.logger.log(`📦 Applicable items: ${createDealDto.applicableMenuItems?.length || 0}`);
      this.logger.log(`📋 Applicable categories: ${createDealDto.applicableCategories?.length || 0}`);

      // Convert string IDs to ObjectIds
      const dealData = {
        ...createDealDto,
        professionalId: new Types.ObjectId(createDealDto.professionalId),
        applicableMenuItems: (createDealDto.applicableMenuItems || []).map(id => new Types.ObjectId(id)),
      };

      const createdDeals = new this.dealsModel(dealData);
      const savedDeal = await createdDeals.save();

      this.logger.log(`✅ Deal created successfully: ${savedDeal._id}`);

      // Create notification for all users about the new deal
      try {
        await this.notificationService.createDealNotification(
          (savedDeal._id as Types.ObjectId).toString(),
          savedDeal.description.substring(0, 50),
          savedDeal.restaurantName,
          undefined, // userId - can be set if you want to notify specific users
          undefined, // professionalId
          {
            category: savedDeal.category,
            endDate: savedDeal.endDate,
            discountPercentage: savedDeal.discountPercentage,
          },
        );
      } catch (notifError) {
        this.logger.error('Error creating deal notification:', notifError);
        // Don't fail the deal creation if notification fails
      }

      return savedDeal;
    } catch (error) {
      console.error('Erreur lors de la création :', error);
      throw error;
    }
  }

  async findAll(): Promise<Deals[]> {
    return this.dealsModel.find().exec();
  }

  // 🆕 GET ACTIVE DEALS FOR A PROFESSIONAL
  async findActiveByProfessional(professionalId: string): Promise<Deals[]> {
    const now = new Date();
    return this.dealsModel.find({
      professionalId: new Types.ObjectId(professionalId),
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).exec();
  }

  async findOne(id: string): Promise<Deals> {
    const deal = await this.dealsModel.findById(id).exec();
    if (!deal) throw new NotFoundException('Deal non trouvé');
    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto): Promise<Deals> {
    this.logger.log(`📝 Updating deal ${id}`);
    
    // Convert string IDs to ObjectIds if present
    const updateData: any = { ...updateDealDto };
    if (updateData.applicableMenuItems) {
      updateData.applicableMenuItems = updateData.applicableMenuItems.map((id: any) => new Types.ObjectId(id));
    }
    
    const updated = await this.dealsModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Deal non trouvé');
    
    this.logger.log(`✅ Deal updated successfully`);
    return updated;
  }

  async remove(id: string): Promise<Deals> {
    const deleted = await this.dealsModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Deal non trouvé');
    
    this.logger.log(`🗑️ Deal deleted: ${id}`);
    return deleted;
  }

  // 👇 Job Cron: S'exécute toutes les minutes
  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredDeals() {
    const now = new Date();
    
    const result = await this.dealsModel.deleteMany({
      endDate: { $lt: now },
    });

    if (result.deletedCount > 0) {
      this.logger.log(`🗑️ Auto-deleted ${result.deletedCount} expired deals.`);
    }
  }
}
