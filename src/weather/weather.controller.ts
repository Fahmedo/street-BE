// src/weather/weather.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import {
  WeatherMetrics,
  RainfallTrendData,
  AttendanceCorrelationData,
  SchoolImpactData,
  SeasonalPattern,
} from './dto/weather-response.dto';

@Controller('weather')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * GET /weather/overview
   * Returns weather overview metrics (avg rainfall, extreme days, schools affected, attendance deviation)
   * @query days - Number of days to analyze (default: 30)
   */
  @Get('overview')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async getWeatherOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.weatherService.getWeatherOverview(user.organizationId!, days);
  }

  /**
   * GET /weather/trends
   * Returns weekly rainfall trends with attendance correlation
   * @query weeks - Number of weeks to analyze (default: 8)
   */
  @Get('trends')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async getRainfallTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Query('weeks', new DefaultValuePipe(8), ParseIntPipe) weeks: number,
  ) {
    return this.weatherService.getRainfallTrends(user.organizationId!, weeks);
  }

  /**
   * GET /weather/correlation
   * Returns rainfall vs attendance correlation data
   * @query days - Number of days to analyze (default: 90)
   */
  @Get('correlation')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async getAttendanceCorrelation(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    return this.weatherService.getAttendanceCorrelation(
      user.organizationId!,
      days,
    );
  }

  /**
   * GET /weather/school-impact
   * Returns school-level weather impact data
   * @query days - Number of days to analyze (default: 30)
   */
  @Get('school-impact')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async getSchoolWeatherImpact(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.weatherService.getSchoolWeatherImpact(
      user.organizationId!,
      days,
    );
  }

  /**
   * GET /weather/seasonal
   * Returns seasonal patterns (monthly rainfall and attendance for 2023-2024)
   */
  @Get('seasonal')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async getSeasonalPatterns(@CurrentUser() user: AuthenticatedUser) {
    return this.weatherService.getSeasonalPatterns(user.organizationId!);
  }
}