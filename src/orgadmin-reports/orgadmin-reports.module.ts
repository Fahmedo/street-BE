import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgAdminReportsController } from './orgadmin-reports.controller';
import { OrgAdminReportsService } from './orgadmin-reports.service';

// Entities needed across all report types
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { RewardProgramme } from '../rewardProgramme/entities/reward-programme.entity';
import { RewardIssuance } from '../rewardProgramme/entities/reward-issuance.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      School,
      StudentProfile,
      StudentAttendanceRecord,
      RewardProgramme,
      RewardIssuance,
      OrganizationSchool,
    ]),
  ],
  controllers: [OrgAdminReportsController],
  providers: [OrgAdminReportsService],
  exports: [OrgAdminReportsService],
})
export class OrgAdminReportsModule {}
