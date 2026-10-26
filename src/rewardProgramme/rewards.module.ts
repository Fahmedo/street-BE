import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { RewardProgramme } from './entities/reward-programme.entity';
import { RewardIssuance } from './entities/reward-issuance.entity';
import { RewardProgrammeSchool } from './entities/reward-programme-school.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { RewardSettings } from './entities/reward-settings.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardProgramme,
      RewardIssuance,
      RewardProgrammeSchool,
      School,
      StudentProfile,
      StudentAttendanceRecord,
      OrganizationUser,
      RewardSettings,
      OrganizationSchool
    ]),
  ],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}