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
import { PostsModule } from './posts/posts.module';

// --- ADD THESE IMPORTS FOR STATIC FILE SERVING ---
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { FollowsModule } from './follows/follows.module';
// --- END ADDITIONS ---
import { MenuitemModule } from './menuitem/menuitem.module';
import { OrderModule } from './order/order.module';
import { CartitemModule } from './cartitem/cartitem.module';
import { ChatManagementModule } from './chat-management/chat-management.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/Foodyz'),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UseraccountModule,
    ProfessionalaccountModule,
    AuthModule,
    ChatManagementModule,
    ReclamationModule,
    DealsModule,
    EventsModule,
    PostsModule,
    FollowsModule,
    MenuitemModule,
    OrderModule,
    CartitemModule,
  ],
  controllers: [
    StaticFilesController,
    AppController
  ],
  providers: [AppService],
})
export class AppModule {}