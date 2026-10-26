import { SetMetadata } from '@nestjs/common';
import { AdminUserRole } from 'src/common/enum/admin-user-role';
import { OrganizationRole } from 'src/common/enum/organization-role';

export const ROLES_KEY = 'roles';
export const Role = (...roles: (AdminUserRole | OrganizationRole)[]) =>
  SetMetadata(ROLES_KEY, roles);
