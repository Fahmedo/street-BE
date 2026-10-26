import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { OrganizationFunction } from './helper/organization-function';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { School } from '../school/entities/school.entity';
import { UploadModule } from '../upload/upload.module';
import { EmailModule } from 'src/config/email/email.module';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationUser,SchoolCalendar,School,OrganizationSchool]),
    JwtModule.register({}),
    PassportModule,
    EmailModule,
    UploadModule,
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationFunction,
    RolesGuard,
  ],
})
export class OrganizationModule {}
