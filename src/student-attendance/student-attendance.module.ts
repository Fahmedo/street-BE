import { Module } from '@nestjs/common';
import { StudentAttendanceService } from './student-attendance.service';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentAttendanceGpsLog } from './entities/student-attendance-gps-log.entity';
import { StudentAttendancePhoto } from './entities/student-attendance-photo.entity';
import { StudentAttendanceRecord } from './entities/student-attendance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentAttendanceRecord,
      StudentAttendanceGpsLog,
      StudentAttendancePhoto,
    ]),
  ],

  controllers: [StudentAttendanceController],
  providers: [StudentAttendanceService],
})
export class StudentAttendanceModule {}
