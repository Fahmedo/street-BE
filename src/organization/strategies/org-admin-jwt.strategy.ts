import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from 'src/organization/entities/organization.entity';

@Injectable()
export class OrgAdminJwtStrategy extends PassportStrategy(Strategy, 'org-admin-jwt') {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ACCESS_TOKEN_SECRET || '',
    });
  }

    async validate(payload: any) {
      const organization = await this.organizationRepository.findOne({
        where: { id: payload.userId },
      });

      if (!organization) {
        throw new UnauthorizedException('Invalid token');
      }

      // Return structured object your controllers expect
      return {
        userId: payload.userId,
        organizationId: organization.id,  
        role: payload.role,  
      };
    }
}