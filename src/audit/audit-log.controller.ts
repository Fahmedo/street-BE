import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enum/roles.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN) // ← both roles
  @Get()
  @ApiOperation({ summary: 'Get audit logs (paginated)' })
  async getLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string, 
    @Query('organizationName') organizationName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isSuperAdmin = user.roles.includes(Role.SUPER_ADMIN);

    return this.auditLogService.getLogs({
      // Super admin: use query param if provided, else no org filter (sees all)
      // Org admin: always locked to their own org
      organizationId: isSuperAdmin
        ? organizationId || undefined // ← optional filter for super admin
        : user.organizationId!, // ← forced for org admin

      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      entity,
      action,
      userId,
      organizationName: isSuperAdmin ? organizationName : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get logs for specific entity' })
  async getEntityLogs(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    const isSuperAdmin = user.roles.includes(Role.SUPER_ADMIN);

    const logs = await this.auditLogService.getLogsByEntity(
      entity,
      entityId,
      isSuperAdmin ? undefined : user.organizationId!, // ← super admin sees all orgs
      limit ? parseInt(limit.toString()) : 50,
    );

    return {
      message: 'Success',
      items: logs.map((log) => this.auditLogService.formatLog(log)),
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN)
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get logs for specific user' })
  async getUserLogs(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    const isSuperAdmin = user.roles.includes(Role.SUPER_ADMIN);

    const logs = await this.auditLogService.getLogsByUser(
      userId,
      isSuperAdmin ? undefined : user.organizationId!, // ← super admin sees all
      limit ? parseInt(limit.toString()) : 50,
    );

    return {
      message: 'Success',
      items: logs.map((log) => this.auditLogService.formatLog(log)),
    };
  }
}
