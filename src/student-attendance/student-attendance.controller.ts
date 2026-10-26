import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { StudentAttendanceService } from './student-attendance.service';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

import { CreateStudentAttendanceDto } from './dto/create-student-attendance.dto';
import { UpdateStudentAttendanceDto } from './dto/update-student-attendance.dto';
import {
  AttendanceQueryDto,
  AttendanceDashboardDto,
} from './dto/attendance-dashboard.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { Public } from 'src/common/decorators/public.decorator';
@Controller('student-attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentAttendanceController {
  constructor(
    private readonly studentAttendanceService: StudentAttendanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceQueryDto,
  ): Promise<AttendanceDashboardDto> {
    if (!user.organizationId) {
      throw new UnauthorizedException('No organization context');
    }
    return this.studentAttendanceService.getDashboard(
      user.organizationId,
      query,
    );
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  @Post()
  @Public()
  //@Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN, Role.MENTOR)
  create(@Body() dto: CreateStudentAttendanceDto) {
    return this.studentAttendanceService.create(dto);
  }

  @Get()
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN, Role.MENTOR)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId) {
      throw new UnauthorizedException('No organization context');
    }
    return this.studentAttendanceService.findAll(user.organizationId);
  }

  @Get(':id')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN, Role.MENTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentAttendanceService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentAttendanceDto,
  ) {
    return this.studentAttendanceService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ORGANIZATION_ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.studentAttendanceService.remove(id);

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? user.userId,
      action: AuditAction.ATTENDANCE_DELETED,
      entity: 'StudentAttendance',
      entityId: id,
      details: `Attendance record deleted: ${id} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }
}
