import {
  Body,
  Controller,
  Get,
  Delete,
  Patch,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { SchoolMessages } from './helper/school-message';
import { SchoolsService } from './school.service';
import { CurrentUser } from 'src/organization/decorators/current.user.decorators';
import { Role } from 'src/common/enum/roles.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { ToggleSchoolStatusDto } from './dto/toggle-school-status.dto';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==================== SUPER ADMIN ENDPOINTS ====================

  @Post('global')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[SUPER ADMIN] Create a new global school' })
  @ApiBody({
    description: 'Create global school payload',
    examples: {
      sample: {
        summary: 'Create Global School',
        value: {
          name: 'Greenfield Primary School',
          address: '12 Allen Avenue',
          state: 'Lagos',
          lga: 'Ikeja',
          latitude: 6.6018,
          longitude: 3.3515,
          radiusMeters: 200,
          contactPerson: 'Mr Ade',
          contactPhone: '+2348012345678',
          logoUrl: 'https://cdn.app.com/logo.png',
          schoolType: 'primary',
          attendanceModes: {
            NFC: true,
            PHOTO: true,
            MANUAL: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Global school created successfully',
    schema: {
      example: {
        message: 'Global school created successfully',
        data: {
          schoolId: 'uuid-school-1',
          name: 'Greenfield Primary School',
          code: 'GRE-PRIM-SCH',
          state: 'Lagos',
          lga: 'Ikeja',
        },
      },
    },
  })
  async createGlobalSchool(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSchoolDto,
  ) {
    const result = await this.schoolsService.createGlobalSchool(
      dto,
      user.userId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? '',
      action: AuditAction.SCHOOL_CREATED,
      entity: 'School',
      entityId: result.data.schoolId,
      details: `Global school created: ${dto.name} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? 'Ahyel Super Admin',
    });

    return result;
  }

  @Get('global')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[SUPER ADMIN] Get all global schools' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 10 })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'lga', required: false })
  @ApiQuery({ name: 'searchTerm', required: false, example: 'Lagos' })
  @ApiResponse({
    status: 200,
    description: 'Global schools retrieved',
    schema: {
      example: {
        message: 'Global schools retrieved',
        data: {
          message: 'Success',
          items: [
            {
              schoolId: 'uuid-school-1',
              name: 'Greenfield Primary School',
              code: 'GRE-PRIM-SCH',
              state: 'Lagos',
              lga: 'Ikeja',
              schoolType: 'primary',
              contactPerson: 'Mr Ade',
              contactPhone: '+2348012345678',
              isActive: true,
              organizationsUsing: 3,
              createdAt: '2025-02-01T12:00:00Z',
            },
          ],
          meta: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 50,
            totalPages: 5,
            hasPreviousPage: false,
            hasNextPage: true,
          },
        },
      },
    },
  })
  getAllGlobalSchools(@Query() query: PaginationQueryDto) {
    return this.schoolsService.getAllGlobalSchools(query);
  }

  @Patch('global/:schoolId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[SUPER ADMIN] Update global school' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiBody({
    description: 'Update global school payload',
    examples: {
      sample: {
        summary: 'Update Global School',
        value: {
          name: 'Greenfield International School',
          contactPerson: 'Mrs Adebayo',
          contactPhone: '+2348098765432',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'School updated successfully',
    schema: {
      example: {
        message: 'School updated successfully',
      },
    },
  })
  async updateGlobalSchool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body() dto: UpdateSchoolDto,
  ) {
    const result = await this.schoolsService.updateGlobalSchool(schoolId, dto);

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? '',
      action: AuditAction.SCHOOL_UPDATED,
      entity: 'School',
      entityId: schoolId,
      details: `school updated: ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? 'Ahyel Super Admin',
    });

    return result;
  }

  @Patch('global/:schoolId/status')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[SUPER ADMIN] Toggle global school status' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiBody({ type: ToggleSchoolStatusDto })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'School activated successfully' } },
  })
  async toggleGlobalSchoolStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body() dto: ToggleSchoolStatusDto,
  ) {
    const result = await this.schoolsService.toggleSchoolStatus(
      schoolId,
      dto.isActive,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? '',
      action: dto.isActive
        ? AuditAction.SCHOOL_ACTIVATED
        : AuditAction.SCHOOL_DEACTIVATED,
      entity: 'School',
      entityId: schoolId,
      details: `Global school ${dto.isActive ? 'activated' : 'deactivated'}: ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Get('global/:schoolId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
  async getGlobalSchoolDetails(@Param('schoolId') schoolId: string) {
    return this.schoolsService.getGlobalSchoolDetails(schoolId);
  }
  @Delete('global/:schoolId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[SUPER ADMIN] Delete a global school' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiResponse({
    status: 200,
    description: 'School deleted successfully',
    schema: { example: { message: 'School deleted successfully' } },
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete school - organizations are currently using it',
  })
  async deleteGlobalSchool(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
  ) {
    const result = await this.schoolsService.deleteGlobalSchool(schoolId);

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? '',
      action: AuditAction.SCHOOL_DELETED,
      entity: 'School',
      entityId: schoolId,
      details: `Global school deleted: ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  // ==================== ORG ADMIN ENDPOINTS ====================

  @Get('retrieve')
  @Roles(Role.ORGANIZATION_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      '[ORG ADMIN] Retrieve organization schools dashboard and statistics',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 10 })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'lga', required: false })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    example: 'Lagos',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved',
    schema: {
      example: {
        stats: {
          totalStudents: 1200,
          totalSchools: 5,
          avgAttendanceRate: 87.3,
          avgPerformance: 87.3,
        },
        schools: {
          message: 'Success',
          items: [
            {
              schoolId: 'uuid-school-1',
              schoolName: 'Greenfield Primary School',
              state: 'Lagos',
              code: 'GRE-PRIM-SCH',
              lga: 'Ikeja',
              totalStudents: 320,
              attendanceRate: 89.2,
              performanceRank: 80,
            },
          ],
          meta: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 5,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
          totalAmount: '5',
        },
      },
    },
  })
  retrieveAllSchoolsAndDashboardStat(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.schoolsService.retrieveAllSchoolsAndDashboardStat(
      user.organizationId!,
      query,
    );
  }

  @Get(':schoolId')
  @Roles(Role.ORGANIZATION_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[ORG ADMIN] Retrieve school details by ID' })
  @ApiParam({
    name: 'schoolId',
    example: 'uuid-school-1',
  })
  @ApiResponse({
    status: 200,
    description: 'School details retrieved',
    schema: {
      example: {
        message: SchoolMessages.SCHOOL_DETAILS_RETRIEVED,
        data: {
          schoolId: 'uuid-school-1',
          name: 'Greenfield Primary School',
          code: 'GRE-PRIM-SCH',
          state: 'Lagos',
          lga: 'Ikeja',
          latitude: 6.6018,
          longitude: 3.3515,
          radiusMeters: 200,
          schoolType: 'primary',
          attendanceModes: {
            NFC: true,
            PHOTO: true,
            MANUAL: false,
          },
          isActive: true,
          createdAt: '2025-02-01T12:00:00Z',
          currentCalendar: {
            calendarId: 'uuid-calendar',
            termName: 'First Term',
            startDate: '2025-01-10',
            endDate: '2025-04-10',
          },
          classes: [
            {
              classId: 'uuid-class-1',
              className: 'Primary 3A',
              hierarchyLevel: 3,
              isTerminal: false,
              isActive: true,
              totalStudents: 45,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this school',
  })
  getSchoolDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
  ) {
    return this.schoolsService.retrieveSchoolDetails(
      user.organizationId!,
      schoolId,
    );
  }
}
