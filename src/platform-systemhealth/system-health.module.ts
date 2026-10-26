// system-health/system-health.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SystemHealthService } from './system-health.service';
import { SystemHealthController } from './system-health.controller';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, StudentAttendanceRecord]),
    JwtModule.register({}),
    PassportModule,
  ],
  controllers: [SystemHealthController],
  providers: [SystemHealthService, RolesGuard],
  exports: [SystemHealthService],
})
export class SystemHealthModule {}
