import { Module } from '@nestjs/common';
import { ReclamationService } from './reclamation.service';
import { ReclamationController } from './reclamation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reclamation } from './entities/reclamation.entity';
import { ReclamationSchema } from './schemas/reclamation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reclamation.name, schema: ReclamationSchema }])
  ],
  controllers: [ReclamationController],
  providers: [ReclamationService],
})
export class ReclamationModule {}
