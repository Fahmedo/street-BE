// platform-reports/platform-reports.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PlatformReportsService } from './platform-reports.service';
import { PlatformReportsQueryDto } from './dto/platform-reports-query.dto';
import { PlatformReportsResponseDto } from './dto/platform-reports-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enum/roles.enum';

@Controller('platform-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class PlatformReportsController {
  private readonly logger = new Logger(PlatformReportsController.name);

  constructor(private readonly platformReportsService: PlatformReportsService) {}

  /**
   * GET /platform-reports
   * Returns all 7 report sections in a single response.
   * Query params: timeRange, state, organizationId, academicYear
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllReports(
    @Query() query: PlatformReportsQueryDto,
  ): Promise<PlatformReportsResponseDto> {
    this.logger.log(`Platform reports request — range: ${query.timeRange}`);
    try {
      return await this.platformReportsService.getAllReports(query);
    } catch (error) {
      this.logger.error('Error generating platform reports:', error.message);
      throw error;
    }
  }
}