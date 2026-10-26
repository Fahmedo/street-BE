// organization/helper/jwt-helper.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationUser } from '../../organization-user/entities/organization-user.entity';
import { Role } from '../../common/enum/roles.enum';

type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd'}` | number;

@Injectable()
export class JwtHelper {
  constructor(private readonly jwtService: JwtService) {}

  public validateRefreshToken(refreshToken: string): string | null {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET ?? '',
      });
      return payload?.sub ?? null;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('JWT verification failed:', error.message);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  public generateTokens(user: OrganizationUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.roles[0] as Role,
      organizationId: user.organizationId,
      schoolId: user.schoolId ?? null,
      tenantId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET ?? '',
      expiresIn: (process.env.ACCESS_TOKEN_EXPIRATION ?? '15m') as JwtExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET ?? '',
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRATION ?? '7d') as JwtExpiry,
    });

    return { accessToken, refreshToken };
  }
}