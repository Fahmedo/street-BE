// src/mentor/mentor-assignment.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MentorAssignmentService } from './mentor-assignment.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enum/roles.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AssignMentorToSchoolDto } from './dto/assign-mentor-to-school.dto';
import { AssignMentorToClassesDto } from './dto/assign-mentor-to-classes.dto';
import { AssignMentorToStudentsDto } from './dto/assign-mentor-to-students.dto';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { StudentDetailQueryDto } from 'src/student-profile/dto/student-detail-query.dto';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@ApiTags('Mentor Assignments')
@ApiBearerAuth()
@Controller('mentor-assignments')
export class MentorAssignmentController {
  constructor(
    private readonly mentorAssignmentService: MentorAssignmentService,
  ) {}

  // ─── ASSIGN MENTOR TO SCHOOL ──────────────────────────────────────────────
  @Get()
  @Roles(Role.ORGANIZATION_ADMIN)
  async getMentors(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.getMentors(query, user);
  }

  @Post('school')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign mentor to entire school',
    description: 'Assigns a mentor to all students in a school (current and future)',
  })
  @ApiBody({
    description: 'Assign Mentor to School Payload',
    examples: {
      sample: {
        summary: 'Sample Assignment',
        value: {
          mentorId: '123e4567-e89b-12d3-a456-426614174000',
          schoolId: '123e4567-e89b-12d3-a456-426614174001',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Mentor assigned to school successfully',
    schema: {
      example: {
        message: 'Mentor assigned to school successfully',
        assignment: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          mentorId: '123e4567-e89b-12d3-a456-426614174000',
          scope: 'school',
          schoolId: '123e4567-e89b-12d3-a456-426614174001',
          assignedBy: '123e4567-e89b-12d3-a456-426614174003',
          assignedAt: '2024-03-10T14:23:00Z',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mentor already assigned or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Mentor or school not found',
  })
  async assignMentorToSchool(
    @Body() dto: AssignMentorToSchoolDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.assignMentorToSchool(
      dto.mentorId,
      dto.schoolId,
      user,
    );
  }

  // ─── ASSIGN MENTOR TO CLASSES ─────────────────────────────────────────────
  @Post('classes')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign mentor to specific classes',
    description: 'Assigns a mentor to one or more classes within a school',
  })
  @ApiBody({
    description: 'Assign Mentor to Classes Payload',
    examples: {
      sample: {
        summary: 'Sample Assignment',
        value: {
          mentorId: '123e4567-e89b-12d3-a456-426614174000',
          classIds: [
            '123e4567-e89b-12d3-a456-426614174010',
            '123e4567-e89b-12d3-a456-426614174011',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Mentor assigned to classes successfully',
    schema: {
      example: {
        message: 'Mentor assigned to classes successfully',
        assignments: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            mentorId: '123e4567-e89b-12d3-a456-426614174000',
            scope: 'class',
            schoolId: '123e4567-e89b-12d3-a456-426614174001',
            classId: '123e4567-e89b-12d3-a456-426614174010',
            assignedBy: '123e4567-e89b-12d3-a456-426614174003',
            assignedAt: '2024-03-10T14:23:00Z',
            isActive: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Classes must belong to same school or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Mentor or one or more classes not found',
  })
  async assignMentorToClasses(
    @Body() dto: AssignMentorToClassesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.assignMentorToClasses(
      dto.mentorId,
      dto.classIds,
      user,
    );
  }

  // ─── ASSIGN MENTOR TO STUDENTS ────────────────────────────────────────────
  @Post('students')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign mentor to specific students',
    description: 'Assigns a mentor to individual students (cherry-pick)',
  })
  @ApiBody({
    description: 'Assign Mentor to Students Payload',
    examples: {
      sample: {
        summary: 'Sample Assignment',
        value: {
          mentorId: '123e4567-e89b-12d3-a456-426614174000',
          studentIds: [
            '123e4567-e89b-12d3-a456-426614174020',
            '123e4567-e89b-12d3-a456-426614174021',
            '123e4567-e89b-12d3-a456-426614174022',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Mentor assigned to students successfully',
    schema: {
      example: {
        message: 'Mentor assigned to students successfully',
        assignments: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            mentorId: '123e4567-e89b-12d3-a456-426614174000',
            scope: 'student',
            schoolId: '123e4567-e89b-12d3-a456-426614174001',
            classId: '123e4567-e89b-12d3-a456-426614174010',
            studentId: '123e4567-e89b-12d3-a456-426614174020',
            assignedBy: '123e4567-e89b-12d3-a456-426614174003',
            assignedAt: '2024-03-10T14:23:00Z',
            isActive: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mentor already assigned or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Mentor or one or more students not found',
  })
  async assignMentorToStudents(
    @Body() dto: AssignMentorToStudentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.assignMentorToStudents(
      dto.mentorId,
      dto.studentIds,
      user,
    );
  }

  // ─── GET MENTOR'S ASSIGNED STUDENTS ───────────────────────────────────────
  @Get(':mentorId/students')
  @Roles(Role.ORGANIZATION_ADMIN, Role.MENTOR)
  @ApiOperation({
    summary: "Get mentor's assigned students",
    description: 'Returns all students assigned to a mentor (computed from all scopes)',
  })
  @ApiParam({
    name: 'mentorId',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Mentor ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully',
    schema: {
      example: {
        totalStudents: 25,
        students: [
          {
            studentId: '123e4567-e89b-12d3-a456-426614174020',
            firstName: 'John',
            lastName: 'Doe',
            fullName: 'John Doe',
            schoolId: '123e4567-e89b-12d3-a456-426614174001',
            classId: '123e4567-e89b-12d3-a456-426614174010',
            enrollmentStatus: true,
          },
        ],
        assignments: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            mentorId: '123e4567-e89b-12d3-a456-426614174000',
            scope: 'school',
            schoolId: '123e4567-e89b-12d3-a456-426614174001',
            assignedAt: '2024-03-10T14:23:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Mentor not found',
  })
  async getMentorAssignedStudents(
    @Param('mentorId') mentorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.getMentorAssignedStudents(
      mentorId,
      user.organizationId!,
    );
  }

  // ─── GET MENTOR'S ASSIGNED SCHOOLS ────────────────────────────────────────
  @Get(':mentorId/schools')
  @Roles(Role.ORGANIZATION_ADMIN, Role.MENTOR)
  @ApiOperation({
    summary: "Get mentor's assigned schools",
    description: 'Returns all schools where a mentor has assignments',
  })
  @ApiParam({
    name: 'mentorId',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Mentor ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Schools retrieved successfully',
    schema: {
      example: {
        totalSchools: 2,
        schools: [
          {
            schoolId: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Central High School',
            address: '123 Main St, Lagos',
            isActive: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Mentor not found',
  })
  async getMentorAssignedSchools(
    @Param('mentorId') mentorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.getMentorAssignedSchools(
      mentorId,
      user.organizationId!,
    );
  }

  // ─── GET ALL ASSIGNMENTS (FOR ADMIN) ──────────────────────────────────────
  @Get('all')
  @Roles(Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get all mentor assignments',
    description: 'Returns all mentor assignments in the organization with filters',
  })
  @ApiQuery({
    name: 'mentorId',
    required: false,
    type: String,
    description: 'Filter by mentor ID',
  })
  @ApiQuery({
    name: 'schoolId',
    required: false,
    type: String,
    description: 'Filter by school ID',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['school', 'class', 'student'],
    description: 'Filter by assignment scope',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignments retrieved successfully',
    schema: {
      example: {
        message: 'Success',
        totalAssignments: 15,
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            mentorId: '123e4567-e89b-12d3-a456-426614174000',
            mentorName: 'Sarah Johnson',
            scope: 'school',
            schoolId: '123e4567-e89b-12d3-a456-426614174001',
            schoolName: 'Central High School',
            assignedBy: 'Admin User',
            assignedAt: '2024-03-10T14:23:00Z',
            isActive: true,
          },
        ],
      },
    },
  })
  async getAllAssignments(
    @Query('mentorId') mentorId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('scope') scope?: string,
    @Query('isActive') isActive?: boolean,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.getAllAssignments(
      user?.organizationId!,
      { mentorId, schoolId, scope, isActive },
    );
  }

  // ─── REMOVE ASSIGNMENT ────────────────────────────────────────────────────
  @Delete(':assignmentId')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove mentor assignment',
    description: 'Unassigns a mentor from school/class/student (soft delete)',
  })
  @ApiParam({
    name: 'assignmentId',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174002',
    description: 'Assignment ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment removed successfully',
    schema: {
      example: {
        message: 'Assignment removed successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found',
  })
  async removeAssignment(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.unassignMentor(assignmentId, user);
  }


  @Get(':mentorId/students/:studentId/detail')
  @Roles(Role.ORGANIZATION_ADMIN, Role.MENTOR)
  @ApiOperation({
    summary: "Get mentor's assigned student detail",
    description: 'Returns detailed information about a specific student including attendance records and statistics',
  })
  @ApiParam({
    name: 'mentorId',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Mentor ID',
  })
  @ApiParam({
    name: 'studentId',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174020',
    description: 'Student ID',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Specific session ID (optional, defaults to current active session)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    format: 'date',
    description: 'Start date for attendance records (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    format: 'date',
    description: 'End date for attendance records (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student detail retrieved successfully',
    schema: {
      example: {
        studentInfo: {
          studentId: '123e4567-e89b-12d3-a456-426614174020',
          firstName: 'John',
          lastName: 'Doe',
          middleName: 'Michael',
          fullName: 'John Michael Doe',
          gender: 'Male',
          dateOfBirth: '2010-05-15',
          studentCode: 'STU-2024-001',
          enrollmentDate: '2024-01-15T10:30:00Z',
          profilePhotoUrl: 'https://example.com/photos/student.jpg',
        },
        classInfo: {
          classId: '123e4567-e89b-12d3-a456-426614174010',
          className: 'JSS 1A',
          hierarchyLevel: 1,
          headTeacherId: '123e4567-e89b-12d3-a456-426614174030',
          isTerminal: false,
        },
        schoolInfo: {
          schoolId: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Central High School',
          code: 'CHS-001',
          address: '123 Main St, Lagos',
          state: 'Lagos',
          lga: 'Ikeja',
        },
        organizationInfo: {
          organizationId: '123e4567-e89b-12d3-a456-426614174050',
          organizationName: 'Education Hub Nigeria',
        },
        currentSession: {
          sessionId: '123e4567-e89b-12d3-a456-426614174060',
          academicYear: '2024/2025',
          currentTerm: 'FIRST_TERM',
          startDate: '2024-09-01T00:00:00Z',
          endDate: '2024-12-15T00:00:00Z',
          isActive: true,
        },
        attendanceRecords: [
          {
            attendanceId: '123e4567-e89b-12d3-a456-426614174070',
            attendanceDate: '2024-03-10',
            status: 'PRESENT',
            mode: 'BIOMETRIC',
            academicYear: '2024/2025',
            currentTerm: 'FIRST_TERM',
            remark: 'On time',
            markedByUserId: '123e4567-e89b-12d3-a456-426614174030',
            deviceId: 'DEVICE-001',
            gpsValidationStatus: 'VALID',
            hasPhotos: true,
            hasGpsLogs: true,
            createdAt: '2024-03-10T08:30:00Z',
          },
        ],
        attendanceStats: {
          totalRecords: 45,
          presentCount: 40,
          absentCount: 3,
          lateCount: 2,
          excusedCount: 0,
          attendanceRate: 88.89,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Student, mentor, or session not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Mentor not assigned to this student',
  })
  async getMentorsStudentDetail(
    @Param('mentorId') mentorId: string,
    @Param('studentId') studentId: string,
    @Query() query: StudentDetailQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mentorAssignmentService.getMentorsStudentDetail(
      studentId,
      query,
    );
  }
  
  // ─── GET ASSIGNMENT STATISTICS ────────────────────────────────────────────
  @Get('stats/overview')
  @Roles(Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get assignment statistics',
    description: 'Returns overview of mentor assignments and coverage',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        message: 'Success',
        stats: {
          totalMentors: 15,
          mentorsWithAssignments: 12,
          totalAssignments: 45,
          schoolAssignments: 10,
          classAssignments: 20,
          studentAssignments: 15,
          totalStudentsCovered: 350,
          unassignedMentors: 3,
        },
      },
    },
  })
  async getAssignmentStats(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorAssignmentService.getAssignmentStatistics(
      user.organizationId!,
    );
  }
}