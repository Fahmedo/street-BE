import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { DemographicsService } from './demographics.service';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { DemographicsDashboardDto, DemographicsQueryDto } from './dto/demographics.dto';

/**
 * GET /demographics/dashboard
 *   ?dateRange=year&schoolType=primary&programme=core&region=<schoolId>
 *
 * All params are optional.
 */
@Controller('demographics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DemographicsController {
  constructor(private readonly demographicsService: DemographicsService) {}

  @Get('dashboard')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DemographicsQueryDto,
  ): Promise<DemographicsDashboardDto> {
    if (!user.organizationId) {
      throw new UnauthorizedException('No organization context');
    }
    return this.demographicsService.getDashboard(user.organizationId, query);
  }
}
