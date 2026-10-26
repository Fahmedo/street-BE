import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentProfileService } from './student-profile.service';
import { StudentProfileController } from './student-profile.controller';
import { StudentProfile } from './entities/student-profile.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { School } from 'src/school/entities/school.entity';
import { AlertModule } from './alert/alert.module';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity'; // ✅ ADD THIS IMPORT
import { OrganizationStudent } from './entities/organization_students.entity';
import { MentorAssignment } from 'src/mentor/entities/mentor-assignment.entity'; // ✅ Add this
import { AlertService } from './alert/alert.service';
import { Class } from 'src/school/entities/school-class.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';
import { StudentProfileAdminController } from './student-profile-admin.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentProfile,
      School,
      Class,
      StudentAttendanceRecord,
      SchoolCalendar,
      Organization,
      OrganizationStudent,
      MentorAssignment,
      OrganizationSchool,
    ]),
    AlertModule,
  ],
  controllers: [StudentProfileController, StudentProfileAdminController],
  providers: [StudentProfileService, AlertService],
})
export class StudentProfileModule {}
