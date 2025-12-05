import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReclamationService } from './reclamation.service';
import { ReclamationController } from './reclamation.controller';
import { Reclamation, ReclamationSchema } from './schemas/reclamation.schema';
import { UserAccount, UserSchema } from 'src/useraccount/schema/useraccount.schema';
import { LoyaltyService } from './LoyaltyService';
import { AiValidationService } from './ai-validation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reclamation.name, schema: ReclamationSchema },
      { name: UserAccount.name, schema: UserSchema },
    ]),
  ],
  controllers: [ReclamationController],
  providers: [ReclamationService, AiValidationService, LoyaltyService],
  exports: [ReclamationService, LoyaltyService],
})
export class ReclamationModule {}
