import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import type { AuthenticatedUser } from '../auth.types';

type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token is required');
    }

    const accessToken = authorizationHeader.slice('Bearer '.length).trim();
    const payload = await this.authService.verifyAccessToken(accessToken);

    request.authUser = {
      id: payload.sub,
      role: payload.role,
    };

    return true;
  }
}
