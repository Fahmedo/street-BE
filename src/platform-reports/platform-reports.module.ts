// platform-reports/platform-reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PlatformReportsService } from './platform-reports.service';
import { PlatformReportsController } from './platform-reports.controller';
import { Organization } from '../organization/entities/organization.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { Intervention } from '../intervention/entities/intervention.entity';
import { MentorAssignment } from '../mentor/entities/mentor-assignment.entity';
import { RewardProgramme } from '../rewardProgramme/entities/reward-programme.entity';
import { RewardIssuance } from '../rewardProgramme/entities/reward-issuance.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { RolesGuard } from '../authorization/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationUser,
      School,
      StudentProfile,
      StudentAttendanceRecord,
      Intervention,
      MentorAssignment,
      RewardProgramme,
      RewardIssuance,
      AuditLog,
    ]),
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [PlatformReportsController],
  providers: [PlatformReportsService, RolesGuard],
  exports: [PlatformReportsService],
})
export class PlatformReportsModule {}