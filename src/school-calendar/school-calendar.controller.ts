// src/school-calendar/school-calendar.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { SchoolCalendarService } from './school-calendar.service';
import { CreateSchoolCalendarDto } from './dto/create-school-calendar.dto';
import { UpdateSchoolCalendarDto } from './dto/update-school-calendar.dto';
import { QuerySchoolCalendarDto } from './dto/query-school-calendar.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Role } from 'src/organization/decorators/roles.decorators';
import { OrganizationRole } from 'src/common/enum/organization-role';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { CalendarMessages } from './helper/calendar-messages';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@ApiTags('School Calendar')
@Controller('schools/:schoolId/calendar')
@Role(
  OrganizationRole.ORGANIZATION_ADMIN,
  OrganizationRole.MENTOR,
  OrganizationRole.SCHOOL_ADMIN,
)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolCalendarController {
  constructor(
    private readonly calendarService: SchoolCalendarService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendar terms for a school' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiQuery({ name: 'academicYear', required: false, example: '2024/2025' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'active', 'completed', 'archived'],
  })
  @ApiQuery({ name: 'isCurrent', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Calendars retrieved',
  })
  getCalendars(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Query() query: QuerySchoolCalendarDto,
  ) {
    return this.calendarService.getCalendars(
      user.organizationId!,
      schoolId,
      query,
    );
  }

  @Get(':calendarId')
  @ApiOperation({ summary: 'Get single calendar term' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'calendarId', example: 'uuid-calendar-1' })
  getCalendarById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('calendarId') calendarId: string,
  ) {
    return this.calendarService.getCalendarById(
      user.organizationId!,
      schoolId,
      calendarId,
    );
  }
  @Post()
  @ApiOperation({ summary: 'Create a new calendar term for a school' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiBody({ type: CreateSchoolCalendarDto })
  @ApiResponse({
    status: 201,
    description: 'Calendar created successfully',
  })
  async createCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateSchoolCalendarDto,
  ) {
    const result = await this.calendarService.createCalendar(
      user.organizationId!,
      schoolId,
      dto,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId!,
      action: AuditAction.CALENDAR_CREATED,
      entity: 'SchoolCalendar',
      entityId: (result as any)?.id,
      details: `Calendar term created: ${dto.termName} (${dto.academicYear}) for school ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Patch(':calendarId')
  @ApiOperation({ summary: 'Update calendar term' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'calendarId', example: 'uuid-calendar-1' })
  @ApiBody({ type: UpdateSchoolCalendarDto })
  @ApiResponse({
    status: 200,
    description: 'Calendar updated',
    schema: {
      example: {
        message: CalendarMessages.CALENDAR_UPDATED,
      },
    },
  })
  async updateCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('calendarId') calendarId: string,
    @Body() dto: UpdateSchoolCalendarDto,
  ) {
    return this.calendarService.updateCalendar(
      user.organizationId!,
      schoolId,
      calendarId,
      dto,
    );
  }

  @Patch(':calendarId/set-current')
  @ApiOperation({ summary: 'Set calendar term as current' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'calendarId', example: 'uuid-calendar-1' })
  @ApiResponse({
    status: 200,
    description: 'Calendar set as current',
    schema: {
      example: {
        message: CalendarMessages.CALENDAR_SET_CURRENT,
      },
    },
  })
  async setAsCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('calendarId') calendarId: string,
  ) {
    const result = await this.calendarService.setAsCurrent(
      user.organizationId!,
      schoolId,
      calendarId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId!,
      action: AuditAction.CALENDAR_SET_CURRENT,
      entity: 'SchoolCalendar',
      entityId: calendarId,
      details: `Calendar set as current term: ${calendarId} for school ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Delete(':calendarId')
  @ApiOperation({ summary: 'Delete calendar term' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'calendarId', example: 'uuid-calendar-1' })
  @ApiResponse({
    status: 200,
    description: 'Calendar deleted',
    schema: {
      example: {
        message: CalendarMessages.CALENDAR_DELETED,
      },
    },
  })
  async deleteCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('calendarId') calendarId: string,
  ) {
    const result = await this.calendarService.deleteCalendar(
      user.organizationId!,
      schoolId,
      calendarId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId!,
      action: AuditAction.CALENDAR_DELETED,
      entity: 'SchoolCalendar',
      entityId: calendarId,
      details: `Calendar term deleted: ${calendarId} for school ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import calendar terms (e.g., from CSV)' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        calendars: {
          type: 'array',
          items: { $ref: '#/components/schemas/CreateSchoolCalendarDto' },
        },
      },
    },
  })
  bulkImport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body('calendars') calendars: CreateSchoolCalendarDto[],
  ) {
    return this.calendarService.bulkImportCalendars(
      user.organizationId!,
      schoolId,
      calendars,
    );
  }
}
