import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🛡️ JwtAuthGuard - Vérification en cours...');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('🛡️ JwtAuthGuard - HandleRequest:', { err, user, info });

    if (err || !user) {
      console.error('❌ JwtAuthGuard - Erreur:', err || info);
      throw err || new UnauthorizedException('Token invalide ou expiré');
    }

    console.log('✅ JwtAuthGuard - User autorisé:', user);
    return user;
  }
}