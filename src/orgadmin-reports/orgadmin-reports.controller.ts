import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { OrgAdminReportsService } from './orgadmin-reports.service';
import { QueryReportDto, ReportType } from './dto/query-report.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';



@ApiTags('Org Admin Reports')
@ApiBearerAuth()
@Controller('orgadminreports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZATION_ADMIN)
export class OrgAdminReportsController {
  constructor(private readonly reportsService: OrgAdminReportsService) {}

  /**
   * GET /reports/attendance
   * Attendance summary, by-school breakdown, monthly trend, lowest performing.
   */
  @Get('attendance')
  @ApiOperation({ summary: 'Get attendance report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  getAttendanceReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryReportDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.reportsService.getAttendanceReport(user.organizationId, query);
  }

  /**
   * GET /reports/rewards
   * Rewards summary, by-programme breakdown, monthly issuances, outcome tracking.
   */
  @Get('rewards')
  @ApiOperation({ summary: 'Get rewards report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getRewardsReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryReportDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.reportsService.getRewardsReport(user.organizationId, query);
  }

  /**
   * GET /reports/demographics
   * School/student counts by region, gender, school type, enrollment trend.
   */
  @Get('demographics')
  @ApiOperation({ summary: 'Get demographics report' })
  getDemographicsReport(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.reportsService.getDemographicsReport(user.organizationId);
  }

  /**
   * GET /reports/students
   * Student counts, alert severity breakdown, schools with most alerts.
   */
  @Get('students')
  @ApiOperation({ summary: 'Get students & risk report' })
  getStudentsReport(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.reportsService.getStudentsReport(user.organizationId);
  }

  /**
   * GET /reports/full
   * All sections combined in one response — used for the Export Center.
   */
  @Get('full')
  @ApiOperation({ summary: 'Get full combined report (all sections)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getFullReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryReportDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.reportsService.getFullReport(user.organizationId, query);
  }
}
