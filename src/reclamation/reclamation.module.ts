import { Module } from '@nestjs/common';
import { ReclamationService } from './reclamation.service';
import { ReclamationController } from './reclamation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reclamation } from './entities/reclamation.entity';
import { ReclamationSchema } from './schemas/reclamation.schema';
import { LoyaltyService } from 'src/reclamation/LoyaltyService';
import { AiValidationService } from './ai-validation.service';
import { UserAccount, UserSchema} from 'src/useraccount/schema/useraccount.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reclamation.name, schema: ReclamationSchema }, 
      { name: UserAccount.name, schema: UserSchema },
])
  ],
  controllers: [ReclamationController],
  providers: [ReclamationService , AiValidationService, LoyaltyService],
    exports: [ReclamationService, LoyaltyService],

})
export class ReclamationModule {}
