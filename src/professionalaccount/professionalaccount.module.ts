import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfessionalService } from './professionalaccount.service';
import { ProfessionalController } from './professionalaccount.controller';
import { ProfessionalAccount, ProfessionalSchema } from './schema/professionalaccount.schema';
import { TunisianLicenseValidatorService } from './tunisian-license-validator.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProfessionalAccount.name, schema: ProfessionalSchema }
    ]),
    CommonModule, // For SupabaseStorageService
  ],
  controllers: [ProfessionalController],
  providers: [ProfessionalService, TunisianLicenseValidatorService],
  exports: [ProfessionalService, TunisianLicenseValidatorService],
})
export class ProfessionalaccountModule {}
