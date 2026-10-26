// src/platform-overview/platform-overview.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformOverviewController } from './platform-overview.controller';
import { PlatformOverviewService } from './platform-overview.service';
import { Organization } from '../organization/entities/organization.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { Class } from 'src/school/entities/school-class.entity'; // ✅ Add import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      School,
      StudentProfile,
      StudentAttendanceRecord,
      Class,
    ]),
  ],
  controllers: [PlatformOverviewController],
  providers: [PlatformOverviewService],
  exports: [PlatformOverviewService],
})
export class PlatformOverviewModule {}