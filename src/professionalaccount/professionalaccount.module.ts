import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfessionalService } from './professionalaccount.service';
import { ProfessionalController } from './professionalaccount.controller';
import { ProfessionalAccount, ProfessionalSchema } from './schema/professionalaccount.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProfessionalAccount.name, schema: ProfessionalSchema }
    ])
  ],
  controllers: [ProfessionalController],
  providers: [ProfessionalService],
  exports: [ProfessionalService],
})
export class ProfessionalaccountModule {}
