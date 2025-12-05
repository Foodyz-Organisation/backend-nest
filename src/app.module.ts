import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UseraccountModule } from './useraccount/useraccount.module';
import { ProfessionalaccountModule } from './professionalaccount/professionalaccount.module';
import { AuthModule } from './auth/auth.module';
import { MenuitemModule } from './menuitem/menuitem.module';
import { OrderModule } from './order/order.module';
import { CartitemModule } from './cartitem/cartitem.module';




@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/Foodyz'),
    UseraccountModule,
    ProfessionalaccountModule,
    AuthModule,
    MenuitemModule,
    OrderModule,
    CartitemModule,
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
