import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Multer } from 'multer';
import { UploadedFile as IUploadedFile } from '../types/file-upload.interface';


// ✅ New guards & decorators
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Role } from 'src/common/enum/roles.enum';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { CreateSchoolCalendarDto } from '../school-calendar/dto/create-school-calendar.dto';
import { QuerySchoolCalendarDto } from '../school-calendar/dto/query-school-calendar.dto';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';
import { UploadService } from 'src/upload/upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly auditLogService: AuditLogService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Public organization registration (self-service)',
    description:
      'Allows organizations to register themselves. Status will be PENDING until approved by Super Admin.',
  })
  @ApiBody({
    type: CreateOrganizationDto,
    examples: {
      sample: {
        summary: 'Sample Public Registration',
        value: {
          organizationName: 'Hope Foundation Nigeria',
          organizationType: 'NGO',
          country: 'Nigeria',
          state: 'Lagos',
          city: 'Ikeja',
          address: '123 Main Street, Ikeja, Lagos',
          shortCode: 'HFN001',
          contactName: 'John Doe',
          contactEmail: 'contact@hopefoundation.org',
          contactPhone: '+2348012345678',
          contactRole: 'Director',
          intendedUse: 'Full Deployment',
          expectedSchools: 10,
          expectedStudents: '500-1000',
          additionalNotes: 'Looking to deploy across Lagos state',
          nfcAttendance: true,
          photoAttendance: false,
          manualEntry: true,
          academicPerformanceTracking: true,
          weatherInsights: false,
          rewardsAndIncentives: true,
          adminName: 'Jane Smith',
          adminEmail: 'admin@hopefoundation.org',
          documents: [],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registration submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation or duplicate error' })
  async registerOrganization(@Body() dto: CreateOrganizationDto) {
    const result = await this.organizationService.registerOrganization(dto);

    return result;
  }

  @Post('create')
  @ApiOperation({ summary: 'Create an organization account' })
  @ApiBody({
    schema: {},
    examples: {
      sample: {
        summary: 'Sample Organization Payload',
        value: {
          organizationName: 'Fairfield International School',
          organizationType: 'Educational Institution',
          country: 'Nigeria',
          state: 'Lagos',
          shortCode: 'FIS001',
          contactName: 'John Doe',
          contactEmail: 'contact@fairfieldschool.com',
          nfcAttendance: true,
          photoAttendance: false,
          manualEntry: true,
          academicPerformanceTracking: true,
          weatherInsights: false,
          rewardsAndIncentives: true,
          adminName: 'Jane Smith',
          adminEmail: 'admin@fairfieldschool.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation or duplicate error' })
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result =
      await this.organizationService.createOrganizationAccount(dto);

    // No JWT user on public route — log with org's own contact as actor
    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_CREATED,
      entity: 'Organization',
      entityId: result?.id,
      details: `Organization registered: ${dto.organizationName} by ${dto.contactEmail}`,
      platform: Platform.WEB,
      userEmail: dto.contactEmail,
      userName: dto.contactName,
      organizationName: dto.organizationName,
    });

    return result;
  }

@Post('upload/document')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload document for organization',
    description: 'Upload supporting documents (PDF, images, Word docs)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        size: { type: 'number' },
        type: { type: 'string' },
        url: { type: 'string' },
      },
    },
  })
  async uploadDocument(@UploadedFile() file: IUploadedFile) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX',
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const url = await this.uploadService.uploadFile(file);

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: url,
    };
  }
  @Get('retrieve-all')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve all organizations with dashboard stats' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 10 })
  @ApiQuery({ name: 'category', required: false, example: 'ACTIVE' })
  @ApiQuery({ name: 'searchTerm', required: false, example: 'lagos' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  async retrieveAllOrganizations(@Query() query: PaginationQueryDto) {
    return this.organizationService.retrieveAllOrganizations(query);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Param('id') id: string,
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.organizationService.updateOrganization(id, dto);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_UPDATED,
      entity: 'Organization',
      entityId: id,
      details: `Organization updated: ${id} by ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }
  // ✅ New: Activate org + create admin user
  @Patch(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate organization and create admin user' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization activated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async activateOrganization(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.organizationService.activateOrganization(id);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.MENTOR_ACTIVATED, // or add ORG_ACTIVATED to enum
      entity: 'Organization',
      entityId: id,
      details: `Organization activated: ${id} by ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  // ✅ New: Suspend org
  @Patch(':id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization suspended successfully',
  })
  async suspendOrganization(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.organizationService.suspendOrganization(id);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.MENTOR_SUSPENDED, // or add ORG_SUSPENDED to enum
      entity: 'Organization',
      entityId: id,
      details: `Organization suspended: ${id} by ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve organization account by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or organization not found',
  })
  async retrieveOrganizationAccountById(@Param('id') id: string) {
    return this.organizationService.retrieveOrganizationAccountById(id);
  }

  @Get(':orgId/calendars')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get all calendars for schools under an organization',
    description:
      'Retrieves all school calendars for all schools belonging to the specified organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({ name: 'limit', required: false, example: 10, type: Number })
  @ApiQuery({
    name: 'academicYear',
    required: false,
    description: 'Filter by academic year',
    example: '2024/2025',
  })
  @ApiQuery({
    name: 'schoolId',
    required: false,
    description: 'Filter by specific school',
  })
  @ApiQuery({
    name: 'termName',
    required: false,
    description: 'Filter by term name',
  })
  @ApiQuery({
    name: 'isCurrent',
    required: false,
    description: 'Filter by current term',
    type: Boolean,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'active', 'completed', 'archived'],
  })
  @ApiResponse({
    status: 200,
    description: 'Calendars retrieved successfully',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/SchoolCalendar' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationCalendars(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QuerySchoolCalendarDto,
    @CurrentUser() user: any, // Get current user for authorization checks
  ) {
    // If user is ORGANIZATION_ADMIN, ensure they only access their own organization
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        "You can only access your own organization's calendars",
      );
    }

    return this.organizationService.getOrganizationCalendars(orgId, query);
  }

  /**
   * ✅ NEW: Create a new calendar record for a school under an organization
   * Accessible by: ORGANIZATION_ADMIN, SUPER_ADMIN
   */
  @Post(':orgId/schools/:schoolId/calendars')
  async createSchoolCalendar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('schoolId') schoolId: string, // don't use ParseUUIDPipe here
    @Body() createDto: CreateSchoolCalendarDto,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        'You can only create calendars for your own organization',
      );
    }

    // "all" is the sentinel value for "apply to all schools"
    const resolvedSchoolId = schoolId === 'all' ? null : schoolId;

    return this.organizationService.createSchoolCalendar(
      orgId,
      resolvedSchoolId,
      createDto,
    );
  }
  /**
   * ✅ NEW: Get statistics about calendars for an organization
   * Accessible by: ORGANIZATION_ADMIN, SUPER_ADMIN
   */
  @Get(':orgId/calendars/stats')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get calendar statistics for organization',
    description:
      'Returns statistics about calendars across all schools in the organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      properties: {
        totalCalendars: { type: 'number' },
        activeCalendars: { type: 'number' },
        currentTerms: { type: 'number' },
        schoolsWithCalendars: { type: 'number' },
        schoolsWithoutCalendars: { type: 'number' },
        byAcademicYear: {
          type: 'array',
          items: {
            properties: {
              academicYear: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        byStatus: {
          type: 'array',
          items: {
            properties: {
              status: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getOrganizationCalendarStats(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        "You can only access your own organization's statistics",
      );
    }

    return this.organizationService.getOrganizationCalendarStats(orgId);
  }
  @Get(':orgId/schools/:schoolId/current-term')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get current term for a specific school',
    description: 'Returns the currently active term for the specified school',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiParam({ name: 'schoolId', description: 'School ID', type: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Current term retrieved successfully',
    type: SchoolCalendar,
  })
  @ApiResponse({ status: 404, description: 'School or current term not found' })
  async getSchoolCurrentTerm(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        "You can only access your own organization's data",
      );
    }

    return this.organizationService.getSchoolCurrentTerm(orgId, schoolId);
  }

  /**
   * ✅ NEW: Set a term as current for a school
   * Accessible by: ORGANIZATION_ADMIN, SUPER_ADMIN
   */
  @Patch(':orgId/schools/:schoolId/current-term/:calendarId')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Set a term as current for a school',
    description:
      'Sets the specified term as current and automatically unsets other current terms for the school',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiParam({ name: 'schoolId', description: 'School ID', type: 'uuid' })
  @ApiParam({ name: 'calendarId', description: 'Calendar ID', type: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Current term updated successfully',
    type: SchoolCalendar,
  })
  @ApiResponse({ status: 404, description: 'Calendar or school not found' })
  async setCurrentTerm(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('calendarId', ParseUUIDPipe) calendarId: string,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        "You can only update your own organization's data",
      );
    }

    return this.organizationService.setCurrentTerm(orgId, schoolId, calendarId);
  }
  /**
   * ✅ NEW: Bulk create calendars for multiple schools
   * Accessible by: ORGANIZATION_ADMIN, SUPER_ADMIN
   */
  @Post(':orgId/calendars/bulk')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Bulk create calendars for multiple schools',
    description:
      'Creates calendar entries for multiple schools in the organization at once',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        calendars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              schoolId: { type: 'string', format: 'uuid' },
              academicYear: { type: 'string', example: '2024/2025' },
              termName: { type: 'string', example: 'First Term' },
              termOrder: { type: 'number', example: 1 },
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
              isCurrent: { type: 'boolean', default: false },
              status: {
                type: 'string',
                enum: ['draft', 'active', 'completed', 'archived'],
              },
              holidays: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Calendars created successfully' })
  async bulkCreateCalendars(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body('calendars')
    calendars: Array<CreateSchoolCalendarDto & { schoolId: string }>,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        'You can only create calendars for your own organization',
      );
    }

    return this.organizationService.bulkCreateCalendars(orgId, calendars);
  }

  /**
   * ✅ NEW: Update a calendar record
   * Accessible by: ORGANIZATION_ADMIN, SUPER_ADMIN
   */
  @Patch(':orgId/calendars/:calendarId')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update a calendar record' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiParam({ name: 'calendarId', description: 'Calendar ID', type: 'uuid' })
  @ApiBody({
    type: CreateSchoolCalendarDto,
    description: 'Partial update fields',
  })
  @ApiResponse({ status: 200, description: 'Calendar updated successfully' })
  async updateCalendar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('calendarId', ParseUUIDPipe) calendarId: string,
    @Body() updateDto: Partial<CreateSchoolCalendarDto>,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        'You can only update calendars in your own organization',
      );
    }

    return this.organizationService.updateCalendar(
      orgId,
      calendarId,
      updateDto,
    );
  }

  /**
   * ✅ NEW: Delete a calendar record
   * Accessible by: ORGANIZATION_ADMIN, SUPER_ADMIN
   */
  @Delete(':orgId/calendars/:calendarId')
  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Delete a calendar record' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: 'uuid' })
  @ApiParam({ name: 'calendarId', description: 'Calendar ID', type: 'uuid' })
  @ApiResponse({ status: 200, description: 'Calendar deleted successfully' })
  async deleteCalendar(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('calendarId', ParseUUIDPipe) calendarId: string,
    @CurrentUser() user: any,
  ) {
    if (
      user.role === Role.ORGANIZATION_ADMIN &&
      user.organizationId !== orgId
    ) {
      throw new ForbiddenException(
        'You can only delete calendars in your own organization',
      );
    }

    return this.organizationService.deleteCalendar(orgId, calendarId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Permanently delete an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  async deleteOrganization(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.organizationService.deleteOrganization(id);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_DELETED,
      entity: 'Organization',
      entityId: id,
      details: `Organization permanently deleted: ${id} by ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }
}
