// platform-demographics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PlatformDemographicsService } from './platform-demographics.service';
import { PlatformDemographicsController } from './platform-demographics.controller';
import { Organization } from '../organization/entities/organization.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { RolesGuard } from 'src/authorization/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      School,
      StudentProfile,
      StudentAttendanceRecord,
    ]),
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [PlatformDemographicsController],
  providers: [PlatformDemographicsService, RolesGuard],
  exports: [PlatformDemographicsService],
})
export class PlatformDemographicsModule {}