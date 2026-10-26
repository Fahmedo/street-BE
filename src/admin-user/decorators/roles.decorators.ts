// src/admin-user/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AdminUserRole } from '../../common/enum/admin-user-role'; // Adjusted path

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route handler
 * Used in combination with RolesGuard to protect routes
 * 
 * @param roles - Array of AdminUserRole values that are allowed to access the route
 * 
 * @example
 * @Roles(AdminUserRole.ADMIN, AdminUserRole.SUPER_ADMIN)
 * @Get('admin-only')
 * async adminOnlyRoute() {
 *   return { message: 'Only admins can see this' };
 * }
 */
export const Roles = (...roles: AdminUserRole[]) =>
  SetMetadata(ROLES_KEY, roles);