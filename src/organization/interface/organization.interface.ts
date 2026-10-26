import { OrganizationRole } from 'src/common/enum/organization-role';

export interface JwtPayload {
  userId: string;
  adminEmail?: string;
  adminName?: string;
  organizationName?: string;
  role?: string;
  iat?: string;
  exp?: string;
}
export interface AuthenticatedAdminUser {
  userId: string;
  email: string;
  role: OrganizationRole;
  fullName: string;
  status: string;
}
