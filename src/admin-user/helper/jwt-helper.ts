import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminUserMessage } from './admin-user-messages';
import { JwtPayload } from '../interface/admin-user.interface';
import { AdminUser } from '../entities/admin-user.entity';

type JwtExpiry = `${number}${'s' | 'm' | 'h' | 'd'}` | number;

@Injectable()
export class JwtHelper {
  constructor(private readonly jwtService: JwtService) {}

  public validateRefreshToken(refreshToken: string): string | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET as string,
      });

      return payload?.userId ?? null;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('JWT verification failed:', error.message);
      } else {
        console.error('JWT verification failed:', error);
      }
      throw new UnauthorizedException(AdminUserMessage.INVALID_REFRESH_TOKEN);
    }
  }

  public generateAccessToken(admin: AdminUser): string {
    const payload: JwtPayload = {
      userId: admin.id,
      email: admin.email,
      roles: admin.roles.map(r => String(r)),
      fullName: `${admin.firstName} ${admin.lastName}`.trim(),
      status: admin.status,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET as string,
      expiresIn: (process.env.ACCESS_TOKEN_EXPIRATION ?? '1h') as JwtExpiry,
    });
  }

  public generateRefreshToken(admin: AdminUser): string {
    const payload: JwtPayload = {
      userId: admin.id,
      email: admin.email,
      roles: admin.roles.map(r => String(r)),
      fullName: `${admin.firstName} ${admin.lastName}`.trim(),
      status: admin.status,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET as string,
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRATION ?? '7d') as JwtExpiry,
    });
  }

  public generateTokens(admin: AdminUser) {
    return {
      accessToken: this.generateAccessToken(admin),
      refreshToken: this.generateRefreshToken(admin),
    };
  }
}
