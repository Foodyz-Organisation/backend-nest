// src/posts/posts.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './schemas/post.schema';
// --- ADD THIS IMPORT ---
import { Comment, CommentSchema } from './schemas/comment.schema'; // Import Comment Schema
// --- END ADDITION ---
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { UserAccount, UserSchema } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalSchema } from 'src/professionalaccount/schema/professionalaccount.schema';
import { Like, LikeSchema } from './schemas/like.schema'; // <-- NEW
import { Save, SaveSchema } from './schemas/save.schema'; // <-- NEW
import { FollowsModule } from 'src/follows/follows.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema }, // This line should now work
      { name: UserAccount.name, schema: UserSchema }, // Import UserAccount schema if needed
      { name: ProfessionalAccount.name, schema: ProfessionalSchema }, // <-- REGISTER PROFESSIONAL ACCOUNT MODEL
      { name: Like.name, schema: LikeSchema }, // <-- NEW
      { name: Save.name, schema: SaveSchema },
    ]),
        FollowsModule, // <-- NEW: Import FollowsModule
  ],
  controllers: [PostsController],
  providers: [PostsService],
  // If you later need PostsService or Post/Comment models in other modules,
  // you might need to add `exports: [PostsService, MongooseModule.forFeature([...])]`
})
export class PostsModule {}
