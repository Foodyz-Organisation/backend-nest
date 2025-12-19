import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReclamationService } from './reclamation.service';
import { ReclamationController } from './reclamation.controller';
import { Reclamation, ReclamationSchema } from './schemas/reclamation.schema';
import { UserAccount, UserSchema } from 'src/useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalSchema } from 'src/professionalaccount/schema/professionalaccount.schema';
import { LoyaltyService } from './LoyaltyService';
import { AiValidationService } from './ai-validation.service';
import { OrderModule } from 'src/order/order.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reclamation.name, schema: ReclamationSchema },
      { name: UserAccount.name, schema: UserSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
    ]),
    OrderModule, // ✅ Import OrderModule pour accéder à OrderService
    NotificationModule,
  ],
  controllers: [ReclamationController],
  providers: [ReclamationService, AiValidationService, LoyaltyService],
  exports: [ReclamationService, LoyaltyService],
})
export class ReclamationModule { }
