// platform-analytics.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformAnalyticsQueryDto } from './dto/platform-analytics-query.dto';
import { PlatformAnalyticsResponseDto } from './dto/platform-analytics-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enum/roles.enum';

@Controller('platform-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformAnalyticsController {
  private readonly logger = new Logger(PlatformAnalyticsController.name);

  constructor(
    private readonly platformAnalyticsService: PlatformAnalyticsService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN) // Only super admin can access platform-wide analytics
  @HttpCode(HttpStatus.OK)
  async getPlatformAnalytics(
    @Query() query: PlatformAnalyticsQueryDto,
  ): Promise<PlatformAnalyticsResponseDto> {
    //this.logger.log('Fetching platform analytics with query:', query);

    try {
      const analytics =
        await this.platformAnalyticsService.getPlatformAnalytics(query);

      //this.logger.log('Successfully retrieved platform analytics');
      return analytics;
    } catch (error) {
      this.logger.error('Error fetching platform analytics:', error.message);
      throw error;
    }
  }

  @Get('/export')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportPlatformAnalytics(
    @Query() query: PlatformAnalyticsQueryDto,
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    this.logger.log('Exporting platform analytics report');

    // TODO: Implement export to CSV/PDF functionality
    // This would generate a file and return a temporary download URL

    return {
      downloadUrl: '/downloads/platform-analytics-report.pdf',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
    };
  }
}
