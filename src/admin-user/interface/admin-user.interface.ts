import { AdminUserRole } from 'src/common/enum/admin-user-role';
import { AdminUserStatus } from 'src/common/enum/admin-user-status';
import { Role } from 'src/common/enum/roles.enum';
export interface JwtPayload {
  userId: string;
  email?: string;
  fullName?: string;
  roles?: string[];
  status: AdminUserStatus;
  iat?: string;
  exp?: string;
}

export interface AuthenticatedAdminUser {
  userId: string;
  email: string;
  roles: string[];
  fullName: string;
  status: string;
}
