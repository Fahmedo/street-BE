// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  JwtPayload,
  AuthenticatedUser,
} from '../interfaces/jwt-payload.interface';
import { Role } from '../../common/enum/roles.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ACCESS_TOKEN_SECRET ?? '',
    });
  }

  // No DB call needed here — JWT is already verified cryptographically
  // Only hit DB in guards if you need to check if user is still active
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      roles: payload.roles ?? [payload.role],
      organizationId: payload.organizationId,
      schoolId: payload.schoolId,
      tenantId: payload.tenantId,
      fullName: payload.fullName ?? null,
      organizationName: payload.organizationName ?? null,
    };
  }
}
