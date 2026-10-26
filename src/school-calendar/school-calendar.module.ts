// src/school-calendar/school-calendar.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolCalendarController } from './school-calendar.controller';
import { SchoolCalendarService } from './school-calendar.service';
import { SchoolCalendar } from './entities/school-calendar.entity';
import { School } from '../school/entities/school.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolCalendar, School,OrganizationSchool])],
  controllers: [SchoolCalendarController],
  providers: [SchoolCalendarService],
  exports: [SchoolCalendarService],
})
export class SchoolCalendarModule {}