// src/organization-overview/organization-overview.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationOverviewController } from './organization-overview.controller';
import { OrganizationOverviewService } from './organization-overview.service';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      School,
      StudentProfile,
      StudentAttendanceRecord,
      SchoolCalendar,
      OrganizationSchool
    ]),
  ],
  controllers: [OrganizationOverviewController],
  providers: [OrganizationOverviewService],
  exports: [OrganizationOverviewService],
})
export class OrganizationOverviewModule {}