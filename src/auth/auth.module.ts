import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserAccount, UserSchema } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalSchema } from '../professionalaccount/schema/professionalaccount.schema';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: UserAccount.name, schema: UserSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
