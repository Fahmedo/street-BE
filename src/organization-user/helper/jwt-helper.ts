import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationUser } from '../entities/organization-user.entity';
import { JwtPayload } from '../interface/organization-user.interface';
import { OrganizationUserMessage } from './organization-user-messages';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Role } from 'src/common/enum/roles.enum';

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
      throw new UnauthorizedException(
        OrganizationUserMessage.INVALID_REFRESH_TOKEN,
      );
    }
  }

  public generateAccessToken(organizationUser: OrganizationUser): string {
    const payload: JwtPayload = {
      userId: organizationUser.id,
      email: organizationUser.email,
      firstName: organizationUser.firstName,
      lastName: organizationUser.lastName,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET as string,
      expiresIn: (process.env.ACCESS_TOKEN_EXPIRATION ?? '1h') as JwtExpiry,
    });
  }

  public generateRefreshToken(organizationUser: OrganizationUser): string {
    const payload: JwtPayload = {
      userId: organizationUser.id,
      email: organizationUser.email,
      firstName: organizationUser.firstName,
      lastName: organizationUser.lastName,
    };

    return this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET as string,
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRATION ?? '7d') as JwtExpiry,
    });
  }

  public generateTokens(organizationUser: OrganizationUser) {
    return {
      accessToken: this.generateAccessToken(organizationUser),
      refreshToken: this.generateRefreshToken(organizationUser),
    };
  }

  public async firebaseToken(organizationUser: OrganizationUser) {
    if (!organizationUser.roles.includes(Role.SCHOOL_ADMIN)) {
      return undefined;
    }

    if (getApps().length === 0) {
      initializeApp({ credential: applicationDefault() });
    }

    const uid = organizationUser.id.toString();
    const claims: JwtPayload = {
      userId: organizationUser.id,
      email: organizationUser.email,
      firstName: organizationUser.firstName,
      lastName: organizationUser.lastName,
      role: organizationUser.roles[0],
    };

    return await getAuth().createCustomToken(uid, claims);
  }
}
