// src/authorization/guards/roles.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../authorization.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../../common/enum/roles.enum';

/**
 * RolesGuard - Role-based access control with resource validation
 *
 * Enforces:
 * - Role-based permissions
 * - School status validation for school-level roles
 * - Public route bypass
 * - Clear error messages for unauthorized access
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access (protected by JWT guard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Ensure user is authenticated
    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Validate user has required role
    this.validateUserRole(user.role, requiredRoles);

    // Validate resource access for role-specific restrictions
    await this.validateResourceAccess(user);

    return true;
  }

  /**
   * Validate that user has one of the required roles
   * 
   * @param userRole - Current user's role
   * @param requiredRoles - Array of allowed roles
   * @throws ForbiddenException if user lacks required role
   */
  private validateUserRole(userRole: Role, requiredRoles: Role[]): void {
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
        details: {
          requiredRoles,
          userRole,
        },
      });
    }
  }

  /**
   * Validate resource-level access based on role
   * 
   * - SUPER_ADMIN: No restrictions
   * - ORGANIZATION_ADMIN: No restrictions within their organization
   * - SCHOOL_ADMIN: Must have active school
   * - MENTOR: Must have active school
   * 
   * @param user - Authenticated user object
   * @throws ForbiddenException if resource validation fails
   */
  private async validateResourceAccess(user: any): Promise<void> {
    // Organization-level roles bypass school validation
    const orgLevelRoles = [Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN];
    
    if (orgLevelRoles.includes(user.role)) {
      return;
    }

    // School-level roles require school validation
    const schoolLevelRoles = [Role.SCHOOL_ADMIN];

    if (schoolLevelRoles.includes(user.role)) {
      await this.validateSchoolAccess(user);
    }
  }

  /**
   * Validate school access for school-level users
   * 
   * @param user - Authenticated user object
   * @throws ForbiddenException if school is inactive or not assigned
   */
  private async validateSchoolAccess(user: any): Promise<void> {
    // User must have a school assigned
    if (!user.schoolId) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'No school assigned',
        error: 'Forbidden',
        details: 'Your account is not assigned to any school. Please contact your administrator.',
      });
    }

    // Validate school is active
    const isActive = await this.authorizationService.isSchoolActive(user.schoolId);

    if (!isActive) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'School access suspended',
        error: 'Forbidden',
        details: 'Your school has been deactivated. Please contact your organization administrator.',
      });
    }
  }
}