import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './useraccount.controller';
import { UserAccount, UserSchema } from './schema/useraccount.schema';
import { UsersService } from './useraccount.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAccount.name, schema: UserSchema }
    ])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UseraccountModule {}
