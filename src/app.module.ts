import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UseraccountModule } from './useraccount/useraccount.module';
import { ProfessionalaccountModule } from './professionalaccount/professionalaccount.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';

// --- ADD THESE IMPORTS FOR STATIC FILE SERVING ---
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { FollowsModule } from './follows/follows.module';
// --- END ADDITIONS ---

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/Foodyz'),
     // --- ADD THIS CONFIGURATION FOR STATIC FILE SERVING ---
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Points to the 'uploads' folder at your project root
      serveRoot: '/uploads',                      // Files will be accessible via /uploads/* route
    }),
    // --- END ADDITIONS ---
    UseraccountModule,
    ProfessionalaccountModule,
    AuthModule,
    PostsModule,
    FollowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
