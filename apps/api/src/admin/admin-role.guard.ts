import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';

type AdminRequest = Request & {
  authUser?: AuthenticatedUser;
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (request.authUser?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access is required.');
    }
    return true;
  }
}
