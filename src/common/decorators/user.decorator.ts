import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    console.log('👤 CurrentUser Decorator - User:', user);

    return user; // Injecté par JwtStrategy
  },
);