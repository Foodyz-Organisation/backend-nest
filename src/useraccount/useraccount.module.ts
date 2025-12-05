import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './useraccount.controller';
import { UserAccount, UserSchema } from './schema/useraccount.schema';
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
export class UseraccountModule {}
