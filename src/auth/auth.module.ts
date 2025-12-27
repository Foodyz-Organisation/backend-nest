import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserAccount, UserSchema } from '../useraccount/schema/useraccount.schema';
import { ProfessionalAccount, ProfessionalSchema } from '../professionalaccount/schema/professionalaccount.schema';
import { JwtStrategy } from './jwt.strategy';
import { ProfessionalaccountModule } from '../professionalaccount/professionalaccount.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is not defined');
        return {
          secret,
          signOptions: {
            expiresIn: '24h', // ✅ Durée par défaut de 24h
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: UserAccount.name, schema: UserSchema },
      { name: ProfessionalAccount.name, schema: ProfessionalSchema },
    ]),
    ProfessionalaccountModule, // For license validation
    CommonModule, // For Supabase storage
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule], // ✅ Exporter pour utilisation ailleurs
})
export class AuthModule { }