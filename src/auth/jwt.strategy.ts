import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // ✅ Vérifier l'expiration
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });

    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    console.log('🔐 JwtStrategy initialized with secret from env');
  }

  async validate(payload: any) {
    console.log('🔐 JWT Strategy - Payload reçu:', payload);

    // Vérifier que le payload contient les champs requis
    if (!payload.sub) {
      console.log('❌ Missing sub in payload');
      throw new UnauthorizedException('Invalid token: missing sub');
    }

    if (!payload.email) {
      console.log('❌ Missing email in payload');
      throw new UnauthorizedException('Invalid token: missing email');
    }

    if (!payload.role) {
      console.log('❌ Missing role in payload');
      throw new UnauthorizedException('Invalid token: missing role');
    }

    // ✅ Retourner un objet utilisateur normalisé
    const user = {
      userId: payload.sub,           // ID de l'utilisateur
      email: payload.email,           // Email
      username: payload.username,     // Nom d'utilisateur
      nomPrenom: payload.username,    // Alias pour compatibilité
      role: payload.role,             // 'user' ou 'professional'
    };

    console.log('✅ JWT Strategy - User validé:', user);
    return user;
  }
}