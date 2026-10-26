// src/auth/interfaces/jwt-payload.interface.ts
import { Role } from 'src/common/enum/roles.enum';
export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  role: Role;
  organizationId: string | null;
  schoolId: string | null;
  tenantId: string | null;
  fullName?: string | null;
  organizationName?: string | null;
}

// What @CurrentUser() returns in controllers
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  roles: Role[];
  organizationId: string | null;
  schoolId: string | null;
  tenantId: string | null;
  fullName?: string | null;
  organizationName?: string | null;
}
