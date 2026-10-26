import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { Organization } from '../organization/entities/organization.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { RolesGuard } from 'src/authorization/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      School,
      StudentProfile,
      StudentAttendanceRecord,
      SchoolCalendar,
    ]),
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [PlatformAnalyticsController],
  providers: [PlatformAnalyticsService, RolesGuard],
  exports: [PlatformAnalyticsService],
})
export class PlatformAnalyticsModule {}