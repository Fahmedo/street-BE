export interface JwtPayload {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  iat?: string;
  exp?: string;
}
