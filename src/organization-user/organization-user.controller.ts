import {
  Controller, Post, Put, Delete, Get,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationUserService } from './organization-user.service';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@ApiTags('Organization Users')
@ApiBearerAuth()
@Controller('organization-users')
export class OrganizationUserController {
  constructor(
    private readonly service: OrganizationUserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Roles(Role.ORGANIZATION_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create organization user' })
  async create(  // ← async
    @Body() dto: CreateOrganizationUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.createOrganizationUserAccount(dto, user);

    this.auditLogService.log({
      userId:           user.userId,
      organizationId:   user.organizationId ?? user.userId,
      action:           AuditAction.USER_CREATED,
      entity:           'OrganizationUser',
      entityId:         (result as any)?.id,
      details:          `User created: ${dto.email} (${(dto.roles ?? []).join(', ')}) by ${user.email}`,
      platform:         Platform.WEB,
      userEmail:        user.email,
      userName:         user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Roles(Role.ORGANIZATION_ADMIN)
  @Put(':userId')
  @ApiOperation({ summary: 'Update organization user' })
  async update(  // ← async
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.updateOrganizationUser(userId, dto, user);

    // Cast to string to bypass enum type mismatch — dto.status is OrganizationStatus
    // but we compare against string values which are the same at runtime
    const status = dto.status as unknown as string;

    const getActionAndDetails = () => {
      if (status === 'active') {
        return { action: AuditAction.USER_ACTIVATED, details: `User activated: ${userId} by ${user.email}` };
      }
      if (status === 'suspended') {
        return { action: AuditAction.USER_SUSPENDED, details: `User suspended: ${userId} by ${user.email}` };
      }
      if (status === 'pending' || status === 'inactive') {
        return { action: AuditAction.USER_UPDATED, details: `User set to ${status}: ${userId} by ${user.email}` };
      }
      const changedFields = Object.keys(dto).filter((k) => (dto as any)[k] !== undefined);
      return {
        action: AuditAction.USER_UPDATED,
        details: `User updated (${changedFields.join(', ')}): ${userId} by ${user.email}`,
      };
    };

    const { action, details } = getActionAndDetails();

    this.auditLogService.log({
      userId:           user.userId,
      organizationId:   user.organizationId ?? user.userId,
      action,
      entity:           'OrganizationUser',
      entityId:         userId,
      details,
      platform:         Platform.WEB,
      userEmail:        user.email,
      userName:         user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  @Roles(Role.ORGANIZATION_ADMIN)
  @Delete(':userId')
  @ApiOperation({ summary: 'Delete organization user' })
  async remove(  // ← async
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.deleteOrganizationUser(userId, user);

    this.auditLogService.log({
      userId:           user.userId,
      organizationId:   user.organizationId ?? user.userId,
      action:           AuditAction.USER_DELETED,
      entity:           'OrganizationUser',
      entityId:         userId,
      details:          `User deleted: ${userId} by ${user.email}`,
      platform:         Platform.WEB,
      userEmail:        user.email,
      userName:         user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  // ─── READ ENDPOINTS — no logs needed ─────────────────────────────────────
  @Roles(Role.ORGANIZATION_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all organization users' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.retrieveAllOrganizationUsers(query, user);
  }

  @Roles(Role.ORGANIZATION_ADMIN)
  @Get(':userId')
  @ApiOperation({ summary: 'Get organization user by id' })
  findOne(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getOrganizationUserById(userId, user);
  }
}