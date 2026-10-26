import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorators';
import { AdminUserRole } from 'src/common/enum/admin-user-role';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ adminUser?: { role?: AdminUserRole } }>();
    const { adminUser } = request;

    if (!adminUser) {
      throw new ForbiddenException('user not authenticated');
    }
    const hasRequiredRole = requiredRoles.some(
      (role) => adminUser.role === role,
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
