// system-health/system-health.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SystemHealthService } from './system-health.service';
import { SystemHealthQueryDto } from './dto/system-health-query.dto';
import { SystemHealthResponseDto } from './dto/system-health-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enum/roles.enum';

@Controller('system-health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemHealthController {
  private readonly logger = new Logger(SystemHealthController.name);

  constructor(private readonly systemHealthService: SystemHealthService) {}

  /**
   * GET /system-health
   * Full system health report — super admin only
   * Query params: timeRange (6h|12h|24h|7d|30d), hours (1–720), organizationId
   */
  @Get()
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getSystemHealth(
    @Query() query: SystemHealthQueryDto,
  ): Promise<SystemHealthResponseDto> {
    this.logger.log(`System health request — range: ${query.timeRange}`);
    try {
      return await this.systemHealthService.getSystemHealth(query);
    } catch (error) {
      this.logger.error('Error fetching system health:', error.message);
      throw error;
    }
  }

  /**
   * GET /system-health/ping
   * Lightweight liveness check — no auth required
   */
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  ping(): { status: string; timestamp: string } {
    return {
      status:    'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /system-health/infrastructure
   * Infrastructure-only check — super admin
   */
  @Get('infrastructure')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getInfrastructure(): Promise<{ infrastructure: any[]; checkedAt: Date }> {
    this.logger.log('Infrastructure-only health check');
    const health = await this.systemHealthService.getSystemHealth({});
    return {
      infrastructure: health.infrastructure,
      checkedAt:       new Date(),
    };
  }
}