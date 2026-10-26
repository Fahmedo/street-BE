// src/organization-overview/organization-overview.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrganizationOverviewService } from './organization-overview.service';
import { CurrentUser } from '../organization/decorators/current.user.decorators';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../organization/decorators/roles.decorators';
import { OrganizationRole } from '../common/enum/organization-role';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { OrganizationOverviewQueryDto ,  DateRangeFilter,} from './dto/organization-overview.dto';

// src/organization-overview/organization-overview.controller.ts


@ApiTags('Organization Overview')
@Controller('organization/overview')
@Role(OrganizationRole.ORGANIZATION_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationOverviewController {
  constructor(
    private readonly overviewService: OrganizationOverviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get organization dashboard overview' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: DateRangeFilter,
    example: DateRangeFilter.THIS_WEEK,
  })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'trendDays', required: false, example: 7 })
  @ApiResponse({
    status: 200,
    description: 'Overview retrieved successfully',
  })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizationOverviewQueryDto,
  ) {
    return this.overviewService.getOverview(user.organizationId!, query);
  }
}