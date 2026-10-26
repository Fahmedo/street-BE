import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from 'src/common/enum/organization-role';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: OrganizationRole[]) =>
  SetMetadata(ROLES_KEY, roles);
