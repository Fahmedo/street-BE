import { Module } from '@nestjs/common';

import { SchoolsService } from './school.service';
import { SchoolsController } from './school.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { StudentProfile } from 'src/student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { Class } from './entities/school-class.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity'; 
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

import { ClassesModule } from './classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      School,
      StudentProfile,
      StudentAttendanceRecord,
      Class,
      SchoolCalendar,
      Organization,
      OrganizationSchool,
    ]),
    JwtModule.register({}),
    PassportModule,
    ClassesModule,
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService, JwtStrategy],
  exports: [
    SchoolsService,            
    TypeOrmModule.forFeature([School])
  ],
})
export class SchoolModule {}