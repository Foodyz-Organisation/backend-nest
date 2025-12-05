import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Deals, DealsSchema } from './schemas/deals.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Deals.name, schema: DealsSchema}])
  ],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
