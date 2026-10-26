// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminUser } from '../admin-user/entities/admin-user.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { Organization } from '../organization/entities/organization.entity';
import { School } from '../school/entities/school.entity';
import { EmailModule } from 'src/config/email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets passed per-call in service
    TypeOrmModule.forFeature([
      AdminUser,
      OrganizationUser,
      Organization,
      School,
    ]),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
