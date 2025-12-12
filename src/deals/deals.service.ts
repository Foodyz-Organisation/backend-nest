import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Deals, DealsDocument } from './schemas/deals.schema';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    @InjectModel(Deals.name) private dealsModel: Model<DealsDocument>,
  ) { }

  async create(createDealDto: CreateDealDto): Promise<Deals> {
    try {
      const createdDeals = new this.dealsModel(createDealDto);
      return await createdDeals.save();
    } catch (error) {
      console.error('Erreur lors de la création :', error);
      throw error;
    }
  }

  async findAll(): Promise<Deals[]> {
    return this.dealsModel.find().exec();
  }

  async findOne(id: string): Promise<Deals> {
    const deal = await this.dealsModel.findById(id).exec();
    if (!deal) throw new NotFoundException('Événement non trouvé');
    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto): Promise<Deals> {
    const updated = await this.dealsModel
      .findByIdAndUpdate(id, updateDealDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Événement non trouvé');
    return updated;
  }

  async remove(id: string): Promise<Deals> {
    const deleted = await this.dealsModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Événement non trouvé');
    return deleted;
  }

  // 👇 Job Cron: S'exécute toutes les minutes
  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredDeals() {
    const now = new Date();
    // Supprime les deals dont la date de fin est passée (< now)
    const result = await this.dealsModel.deleteMany({
      endDate: { $lt: now },
    });

    if (result.deletedCount > 0) {
      this.logger.log(`🗑️ Auto-deleted ${result.deletedCount} expired deals.`);
    }
  }
}
