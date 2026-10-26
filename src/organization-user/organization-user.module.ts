import { Module } from '@nestjs/common';
import { OrganizationUserService } from './organization-user.service';
import { OrganizationUserController } from './organization-user.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationUser } from './entities/organization-user.entity';
import { OrganizationUserFunction } from './helper/organization-user-function';
import { RolesGuard } from './guard/roles.guard';
import { JwtHelper } from './helper/jwt-helper';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { AdminUserFunction } from 'src/admin-user/helper/admin-user-function';
import { OrganizationUserSchool } from './entities/organization-user-school.entity';
import { School } from '../school/entities/school.entity';
import { Organization } from '../organization/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationUser,
      OrganizationUserSchool,
      School,
      Organization,
    ]),
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [OrganizationUserController],
  providers: [
    OrganizationUserService,
    OrganizationUserFunction,
    AdminUserFunction,
    JwtHelper,
    JwtStrategy,
    RolesGuard,
  ],
})
export class OrganizationUserModule {}
