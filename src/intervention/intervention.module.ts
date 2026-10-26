// src/intervention/intervention.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterventionController } from './intervention.controller';
import { InterventionService } from './intervention.service';
import { Intervention } from './entities/intervention.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { AuditModule } from '../audit/audit.module';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Intervention, StudentProfile, SchoolCalendar]),
    AuditModule,
  ],
  controllers: [InterventionController],
  providers: [InterventionService],
  exports: [InterventionService],
})
export class InterventionModule {}