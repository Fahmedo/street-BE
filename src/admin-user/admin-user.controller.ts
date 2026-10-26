import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Get,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

// ✅ New guards & decorators
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';
import { AdminUserStatus } from 'src/common/enum/admin-user-status';

@ApiTags('Admin User')
@ApiBearerAuth()
@Controller('admin-user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUserController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('create')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create admin user account' })
  @ApiBody({
    schema: {},
    examples: {
      sample: {
        summary: 'Sample payload',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'admin@example.com',
          phoneNumber: '+1234567890',
          address: '123 Main St',
          roles: ['SUPER_ADMIN'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation or duplicate error' })
  async createAdminUserAccount(
    @Body() dto: CreateAdminUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.adminUserService.createAdminUserAccount(dto);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_CREATED,
      entity: 'AdminUser',
      entityId: result?.data?.id,
      details: `Admin user created: ${dto.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  @Get('retrieve-all')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve all admin users with dashboard stats' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: '' })
  @ApiQuery({ name: 'searchTerm', required: false, example: '' })
  @ApiResponse({
    status: 200,
    description: 'Admin users retrieved successfully',
  })
  async retrieveAllAdminUsers(@Query() query: PaginationQueryDto) {
    return this.adminUserService.retrieveAllAdminUsers(query);
  }

  @Get('search')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search admin users' })
  @ApiQuery({ name: 'searchTerm', required: true })
  async searchAdminUsers(@Query('searchTerm') searchTerm: string) {
    return this.adminUserService.searchAdminUsers(searchTerm);
  }

  @Get('statistics')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get admin user statistics' })
  async getAdminStatistics() {
    return this.adminUserService.getAdminStatistics();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get admin user by ID' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  async retrieveAdminUserById(@Param('id') id: string) {
    return this.adminUserService.retrieveAdminUserById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update admin user' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  @ApiBody({
    schema: {},
    examples: {
      sample: {
        summary: 'Sample update payload',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+1234567890',
          address: '123 Main St',
          status: 'Active',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Admin user updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin user not found' })
  async updateAdminUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.adminUserService.updateAdminUser(id, dto);

    // Derive action and details from what was actually changed
    const getActionAndDetails = () => {
      if (dto.status === AdminUserStatus.ACTIVE) {
        return {
          action: AuditAction.USER_ACTIVATED,
          details: `Admin user activated: ${id} by ${currentUser.email}`,
        };
      }
      if (dto.status === AdminUserStatus.SUSPENDED) {
        return {
          action: AuditAction.USER_SUSPENDED,
          details: `Admin user suspended: ${id} by ${currentUser.email}`,
        };
      }
      if (dto.status === AdminUserStatus.PENDING) {
        return {
          action: AuditAction.USER_UPDATED,
          details: `Admin user set to pending: ${id} by ${currentUser.email}`,
        };
      }

      const changedFields = Object.keys(dto).filter(
        (k) => (dto as any)[k] !== undefined,
      );
      return {
        action: AuditAction.USER_UPDATED,
        details: `Admin user updated (${changedFields.join(', ')}): ${id} by ${currentUser.email}`,
      };
    };

    const { action, details } = getActionAndDetails();

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action,
      entity: 'AdminUser',
      entityId: id,
      details,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  @Delete(':id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend admin user (soft delete)' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  @ApiResponse({
    status: 200,
    description: 'Admin user suspended successfully',
  })
  async suspendAdminUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.adminUserService.suspendAdminUser(id);
    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.ADMIN_SUSPENDED,
      entity: 'AdminUser',
      entityId: id,
      details: `Admin user suspended: ${id}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  @Delete(':id/permanent')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Permanently delete admin user (hard delete)' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  @ApiResponse({ status: 200, description: 'Admin user permanently deleted' })
  async permanentlyDeleteAdminUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.adminUserService.permanentlyDeleteAdminUser(id);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_DELETED,
      entity: 'AdminUser',
      entityId: id,
      details: `Admin user permanently deleted: ${id}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete (suspend) admin user' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  @ApiResponse({ status: 200, description: 'Admin user deleted successfully' })
  async deleteAdminUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.adminUserService.deleteAdminUser(id);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_DELETED,
      entity: 'AdminUser',
      entityId: id,
      details: `Admin user deleted: ${id}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }
}
