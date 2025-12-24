import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification, NotificationSchema } from './schema/notification.schema';
import { UserAccount, UserSchema } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalSchema } from '../professionalaccount/schema/professionalaccount.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: UserAccount.name, schema: UserSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService], // Export so other modules can use it
})
export class NotificationModule {}
