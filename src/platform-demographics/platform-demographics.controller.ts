// platform-demographics.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { PlatformDemographicsService } from './platform-demographics.service';
import { PlatformDemographicsQueryDto } from './dto/platform-demographics-query.dto';
import { PlatformDemographicsResponseDto } from './dto/platform-demographics-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enum/roles.enum';

@Controller('platform-demographics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformDemographicsController {
  private readonly logger = new Logger(PlatformDemographicsController.name);

  constructor(
    private readonly platformDemographicsService: PlatformDemographicsService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN) // Only super admin can access platform-wide demographics
  @HttpCode(HttpStatus.OK)
  async getDemographicsAnalytics(
    @Query() query: PlatformDemographicsQueryDto,
  ): Promise<PlatformDemographicsResponseDto> {
    this.logger.log('Fetching demographics analytics with query:', query);

    try {
      const analytics =
        await this.platformDemographicsService.getDemographicsAnalytics(query);

      this.logger.log('Successfully retrieved demographics analytics');
      return analytics;
    } catch (error) {
      this.logger.error(
        'Error fetching demographics analytics:',
        error.message,
      );
      throw error;
    }
  }

  @Get('/export')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportDemographicsReport(
    @Query() query: PlatformDemographicsQueryDto,
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    this.logger.log('Exporting demographics analytics report');

    // TODO: Implement export to CSV/PDF functionality
    // This would generate a file and return a temporary download URL

    return {
      downloadUrl: '/downloads/demographics-report.pdf',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
    };
  }
}