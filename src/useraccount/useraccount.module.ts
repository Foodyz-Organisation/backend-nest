import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { UsersController } from './useraccount.controller';
import { UserAccount, UserSchema, UserDocument } from './schema/useraccount.schema';
import { UsersService } from './useraccount.service';
import { Post, PostSchema } from '../posts/schemas/post.schema'; // <-- NEW IMPOR

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAccount.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema } // <-- Add Post schema here
    ])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UseraccountModule implements OnModuleInit {
  constructor(
    @InjectConnection() private connection: Connection,
    @InjectModel(UserAccount.name) private userModel: Model<UserDocument>
  ) {}

  async onModuleInit() {
    // Drop the unique index on username if it exists (allow duplicate usernames)
    try {
      const collection = this.userModel.collection;
      const indexes = await collection.indexes();
      const usernameUniqueIndex = indexes.find(
        (index) => index.key?.username === 1 && index.unique === true
      );

      if (usernameUniqueIndex) {
        console.log('🔄 Dropping unique index on username field...');
        await collection.dropIndex('username_1');
        console.log('✅ Successfully removed unique constraint on username');
      } else {
        console.log('ℹ️ No unique index found on username field (already allows duplicates)');
      }
    } catch (error: any) {
      // Index might not exist, which is fine
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
        console.warn('⚠️ Could not drop username unique index:', error.message);
      }
    }
  }
}
