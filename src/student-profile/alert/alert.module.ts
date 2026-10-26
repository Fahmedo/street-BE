import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertService } from './alert.service';
import { StudentProfile } from '../entities/student-profile.entity';
import { StudentAttendanceRecord } from '../../student-attendance/entities/student-attendance.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';
import { OrganizationStudent } from '../entities/organization_students.entity';
import { MentorAssignment } from 'src/mentor/entities/mentor-assignment.entity'; // ✅ Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentProfile,
      StudentAttendanceRecord,
      OrganizationSchool,
      OrganizationStudent,
      MentorAssignment
    ]),
  ],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
