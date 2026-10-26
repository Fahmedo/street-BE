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
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentProfileService } from './student-profile.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { StudentQueryDto } from './dto/student-query.dto';
import { AlertService } from './alert/alert.service';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZATION_ADMIN, Role.MENTOR, Role.SCHOOL_ADMIN)
export class StudentProfileController {
  constructor(
    private readonly studentProfileService: StudentProfileService,
    private readonly alertService: AlertService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student profile' })
  @ApiBody({
    description: 'Create student profile payload',
    examples: {
      sample: {
        summary: 'Create Student',
        value: {
          firstName: 'Adeola',
          lastName: 'Bello',
          middleName: 'Grace',
          dateOfBirth: '2012-05-14',
          gender: 'FEMALE',
          admissionNumber: 'ADM/2024/001',
          schoolId: 'uuid-school-1',
          classId: 'uuid-class-1',
          parentName: 'Mrs Bello',
          parentPhone: '+2348012345678',
          parentEmail: 'parent@example.com',
          address: '10 Broad Street, Lagos',
          photoUrl: 'https://cdn.app.com/student-photo.png',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Student profile created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request / Validation error' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentProfileDto,
  ) {
   const result = await this.studentProfileService.create(
  dto,
  user.userId,
  user.organizationId!,
);

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId!,
      action: AuditAction.STUDENT_CREATED,
      entity: 'Student',
      entityId: (result as any)?.data?.studentId, // ✅ Fixed to use the returned data
      details: `Student created: ${dto.firstName} ${dto.lastName} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all student profiles with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 10 })
  @ApiQuery({ name: 'searchTerm', required: false, example: 'Adeola' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'createdAt',
    enum: ['createdAt', 'firstName', 'lastName'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({ name: 'schoolId', required: false, example: 'uuid-school-1' })
  @ApiResponse({
    status: 200,
    description: 'Student profiles retrieved successfully',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query()
    query: PaginationQueryDto & {
      schoolId?: string;
      classId?: string;
      gender?: string;
      enrollmentStatus?: string;
      sortBy?: string;
      sortOrder?: string;
    },
  ) {
    return this.studentProfileService.findAll(user.organizationId!, query);
  }

  @Get('alerts')
  @Roles(Role.MENTOR)
  @ApiOperation({ summary: 'Get computed alerts for logged-in mentor' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  async getAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Query()
    query: {
      status?: string;
      severity?: string;
      page?: number;
      perPage?: number;
    },
  ) {
    return this.alertService.getAlertsForMentor(user.userId, query);
  }

  @Get('my-students')
  @Roles(Role.MENTOR)
  @ApiOperation({
    summary: 'Get all students assigned to the logged-in mentor',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'riskLevel', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  async getMyStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StudentQueryDto,
  ) {
    // ✅ FIXED: Pass organizationId as second parameter
    return this.studentProfileService.getMyStudents(
      user.userId,
      user.organizationId!,
      query,
    );
  }

  @Get(':studentId')
  @Roles(Role.MENTOR, Role.SCHOOL_ADMIN, Role.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  async getStudentById(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentProfileService.getStudentById(
      studentId,
      user.organizationId!,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a student profile by ID' })
  @ApiParam({
    name: 'id',
    example: 'uuid-student-1',
    description: 'Student profile ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Student profile not found' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentProfileService.findOne(user.organizationId!, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a student profile by ID' })
  @ApiParam({
    name: 'id',
    example: 'uuid-student-1',
    description: 'Student profile ID',
  })
  @ApiBody({
    description: 'Update student profile payload',
    examples: {
      sample: {
        summary: 'Update Student',
        value: {
          firstName: 'Adeola',
          lastName: 'Bello-Johnson',
          parentPhone: '+2348098765432',
          classId: 'uuid-class-2',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Student profile updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Student profile not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
  const result = await this.studentProfileService.update(
  user.organizationId!,
  id,
  dto,
);

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId!,
      action: AuditAction.STUDENT_UPDATED,
      entity: 'Student',
      entityId: id,
      details: `Student profile updated: ${id} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a student profile by ID' })
  @ApiParam({
    name: 'id',
    example: 'uuid-student-1',
    description: 'Student profile ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student profile deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Student profile not found' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const result = await this.studentProfileService.remove(
      user.organizationId!,
      id,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId!,
      action: AuditAction.STUDENT_DELETED,
      entity: 'Student',
      entityId: id,
      details: `Student profile deleted: ${id} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }
}
