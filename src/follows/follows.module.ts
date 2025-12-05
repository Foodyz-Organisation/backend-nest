// src/follows/follows.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { Follow, FollowSchema } from './schemas/follow.schema'; // <-- NEW: Import Follow schema
import { UserAccount, UserSchema } from '../useraccount/schema/useraccount.schema'; // <-- NEW: Import UserAccount schema
import { ProfessionalAccount, ProfessionalSchema } from '../professionalaccount/schema/professionalaccount.schema'; // <-- NEW: Import ProfessionalAccount schema

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Follow.name, schema: FollowSchema }, // <-- Register Follow model
      { name: UserAccount.name, schema: UserSchema }, // <-- Register UserAccount model (needed for counts)
      { name: ProfessionalAccount.name, schema: ProfessionalSchema }, // <-- Register ProfessionalAccount model (needed for counts)
    ]),
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService], // <-- NEW: Export FollowsService so other modules can use it (e.g., PostsModule)
})
export class FollowsModule {}
