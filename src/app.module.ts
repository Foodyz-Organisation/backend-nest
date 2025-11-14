import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UseraccountModule } from './useraccount/useraccount.module';
import { ProfessionalaccountModule } from './professionalaccount/professionalaccount.module';
import { AuthModule } from './auth/auth.module';
import { ReclamationModule } from './reclamation/reclamation.module';
import { DealsModule } from './deals/deals.module';
import { EventsModule } from './events/events.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,  // ← Important !
      envFilePath: '.env',  // ← Chemin vers le fichier .env
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/Foodyz'),
    UseraccountModule,
    ProfessionalaccountModule,
    AuthModule,
    ReclamationModule,DealsModule,EventsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
