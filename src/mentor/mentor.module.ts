// src/mentor/mentor.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MentorAssignment } from './entities/mentor-assignment.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { MentorAssignmentService } from './mentor-assignment.service';
import { MentorAssignmentController } from './mentor-assignment.controller';
import { AuditModule } from '../audit/audit.module'; // Import AuditModule
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { Class } from 'src/school/entities/school-class.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';



@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorAssignment,
      OrganizationUser,
      School,
      Class,
      StudentProfile,
      StudentAttendanceRecord,
      SchoolCalendar,
    ]),
    AuditModule, // Import to use AuditLogService
  ],
  controllers: [MentorAssignmentController],
  providers: [MentorAssignmentService],
  exports: [MentorAssignmentService],
})
export class MentorModule {}