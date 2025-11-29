import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UseraccountModule } from './useraccount/useraccount.module';
import { ProfessionalaccountModule } from './professionalaccount/professionalaccount.module';
import { AuthModule } from './auth/auth.module';
import { ReclamationModule } from './reclamation/reclamation.module';
import { DealsModule } from './deals/deals.module';
import { EventsModule } from './events/events.module';
import { StaticFilesController } from './static-files.controller'; // ✅ AJOUTER

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/Foodyz'),
    UseraccountModule,
    ProfessionalaccountModule,
    AuthModule,
    ReclamationModule,
    DealsModule,
    EventsModule
  ],
  controllers: [
    StaticFilesController, // ✅ AJOUTER EN PREMIER (avant AppController)
    AppController
  ],
  providers: [AppService],
})
export class AppModule {}