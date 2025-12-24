import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Deals, DealsSchema } from './schemas/deals.schema';
import { NotificationModule } from '../notification/notification.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deals.name, schema: DealsSchema },
    ]),
    NotificationModule,
    CommonModule, // Import CommonModule to access SupabaseStorageService
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
