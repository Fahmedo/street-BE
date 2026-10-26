// src/platform-overview/platform-overview.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlatformOverviewService } from './platform-overview.service';
import { Role } from 'src/common/enum/roles.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import {
  PlatformOverviewQueryDto,
  PlatformDateRangeFilter,
} from './dto/platform-overview.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';

@ApiTags('Platform Overview')
@Controller('platform/overview')
@Roles(Role.SUPER_ADMIN, Role.SCHOOL_MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformOverviewController {
  constructor(private readonly overviewService: PlatformOverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get platform-wide overview (Super Admin only)' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: PlatformDateRangeFilter,
    example: PlatformDateRangeFilter.THIS_MONTH,
  })
  @ApiResponse({
    status: 200,
    description: 'Platform overview retrieved successfully',
  })
  async getOverview(
    @Query() query: PlatformOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.overviewService.getOverview(
      query.range ?? PlatformDateRangeFilter.THIS_MONTH,
      user.role,
    );
  }
}
