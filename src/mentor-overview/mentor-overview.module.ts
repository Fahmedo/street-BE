// src/mentor-overview/mentor-overview.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorOverviewController } from './mentor-overview.controller';
import { MentorOverviewService } from './mentor-overview.service';

// Entity imports
import { MentorAssignment } from '../mentor/entities/mentor-assignment.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { Intervention } from '../intervention/entities/intervention.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorAssignment,
      StudentProfile,
      StudentAttendanceRecord,
      Intervention,
      SchoolCalendar,
    ]),
  ],
  controllers: [MentorOverviewController],
  providers: [MentorOverviewService],
  exports: [MentorOverviewService],
})
export class MentorOverviewModule {}