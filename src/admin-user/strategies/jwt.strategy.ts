import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminUserService } from '../admin-user.service';
import { JwtPayload } from '../interface/admin-user.interface';
import { AdminUserMessage } from '../helper/admin-user-messages';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly adminUserService: AdminUserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ACCESS_TOKEN_SECRET || '',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const adminUser = await this.adminUserService.retrieveAdminUserById(
        payload.userId,
      );

      if (!adminUser) {
        throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
      }

      return {
        userId: adminUser.id,
        email: adminUser.email,
        roles: adminUser.roles,
        fullName: adminUser.fullName,
        status: adminUser.status,
      };
    } catch (error) {
      console.error('Error validating token:', error);
      throw new ForbiddenException(AdminUserMessage.INVALID_TOKEN);
    }
  }
}
