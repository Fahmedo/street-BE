import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('schools/:schoolId/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER) // ✅ CHANGED: Only Super Admin can create classes
  @ApiOperation({ summary: 'Create a new class (Super Admin only)' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiBody({
    description: 'Create class payload',
    examples: {
      sample: {
        summary: 'Create Class',
        value: {
          className: 'Primary 3A',
          hierarchyLevel: 3,
          isTerminal: false,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 409, description: 'Class already exists' })
  async createClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateClassDto,
  ) {
    const result = await this.classesService.createClass(
      user.userId,
      schoolId,
      dto,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? undefined,
      action: AuditAction.CLASS_CREATED,
      entity: 'Class',
      entityId: (result as any)?.data?.classId,
      details: `Class created: ${dto.className} in school ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? undefined,
    });

    return result;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER, Role.ORGANIZATION_ADMIN) // ✅ Both can view
  @ApiOperation({ summary: 'Get all classes for a school' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  getClasses(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
  ) {
    return this.classesService.getClassesBySchool(
      user.userId,
      user.role,
      user.organizationId ?? null,
      schoolId,
    );
  }

  @Get(':classId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER, Role.ORGANIZATION_ADMIN) // ✅ Both can view
  @ApiOperation({ summary: 'Get a specific class' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'classId', example: 'uuid-class-1' })
  @ApiResponse({ status: 200, description: 'Class retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  getClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
  ) {
    return this.classesService.getClassById(
      user.userId,
      user.role,
      user.organizationId ?? null,
      schoolId,
      classId,
    );
  }

  @Get(':classId/students')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER, Role.ORGANIZATION_ADMIN) // ✅ Both can view
  @ApiOperation({ summary: 'Get a class with all its students' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'classId', example: 'uuid-class-1' })
  @ApiResponse({
    status: 200,
    description: 'Class with students retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  getClassWithStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
  ) {
    return this.classesService.getClassWithStudents(
      user.userId,
      user.role,
      user.organizationId ?? null,
      schoolId,
      classId,
    );
  }

  @Patch(':classId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER) // ✅ CHANGED: Only Super Admin can update
  @ApiOperation({ summary: 'Update a class (Super Admin only)' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'classId', example: 'uuid-class-1' })
  @ApiBody({
    description: 'Update class payload',
    examples: {
      sample: {
        summary: 'Update Class',
        value: {
          className: 'Primary 3B',
          hierarchyLevel: 3,
          isTerminal: false,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({ status: 409, description: 'Class name already exists' })
  updateClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.updateClass(user.userId, schoolId, classId, dto);
  }

  @Delete(':classId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER) // ✅ CHANGED: Only Super Admin can delete
  @ApiOperation({ summary: 'Delete a class (Super Admin only)' })
  @ApiParam({ name: 'schoolId', example: 'uuid-school-1' })
  @ApiParam({ name: 'classId', example: 'uuid-class-1' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async deleteClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
  ) {
    const result = await this.classesService.deleteClass(
      user.userId,
      schoolId,
      classId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId ?? undefined,
      action: AuditAction.CLASS_DELETED,
      entity: 'Class',
      entityId: classId,
      details: `Class deleted: ${classId} from school ${schoolId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }
}
