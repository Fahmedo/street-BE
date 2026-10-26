// src/admin-user/guard/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User roles not found');
    }

    // Check if user has ANY of the required roles
    // Convert roles to strings for comparison
    const userRoles = user.roles.map(r => String(r));
    const hasRequiredRole = userRoles.some(userRole =>
      requiredRoles.includes(userRole),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Requires one of roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}