import { Module } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AdminUserFunction } from './helper/admin-user-function';
import { JwtHelper } from './helper/jwt-helper';
import { RolesGuard } from './guard/roles.guard';
import { AdminJwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from 'src/config/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    JwtModule.register({}),
    PassportModule,
    EmailModule
  ],
  controllers: [AdminUserController],
  providers: [
    AdminUserService,
    AdminUserFunction,
    JwtHelper,
    RolesGuard,
    AdminJwtStrategy,
  ],
})
export class AdminUserModule {}
