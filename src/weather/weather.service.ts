// src/weather/weather.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { School } from '../school/entities/school.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { SchoolWeatherImpact } from './entities/school-weather-impact.entity';
import { AttendanceStatus } from '../common/enum/attendance.enums';

import {
  WeatherMetrics,
  RainfallTrendData,
  AttendanceCorrelationData,
  SchoolImpactData,
  SeasonalPattern,
  WeatherApiResponse,
} from './dto/weather-response.dto';
// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  // private readonly BASE_URL = 'https://api.open-meteo.com/v1/forecast';
  private readonly ARCHIVE_URL =
    'https://archive-api.open-meteo.com/v1/archive';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,
    @InjectRepository(SchoolWeatherImpact)
    private readonly impactRepo: Repository<SchoolWeatherImpact>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // 1. WEATHER OVERVIEW METRICS
  // ═══════════════════════════════════════════════════════════════════════

  async getWeatherOverview(
    organizationId: string,
    days: number = 30,
  ): Promise<WeatherMetrics> {
    this.logger.log(`Fetching weather overview for org: ${organizationId}`);

    const schools = await this.getSchoolsWithCoordinates(organizationId);

    if (schools.length === 0) {
      return this.getEmptyMetrics();
    }

    const { avgLat, avgLon } = this.calculateCenterPoint(schools);
    const { startDate, endDate } = this.getDateRange(days);

    const weatherData = await this.fetchHistoricalWeather(
      avgLat,
      avgLon,
      startDate,
      endDate,
    );

    const dailyRain = weatherData.daily.precipitation_sum || [];

    const avgRainfall = this.calculateAverage(dailyRain);
    const extremeWeatherDays = dailyRain.filter((rain) => rain > 50).length;
    const schoolsAffected = await this.countSchoolsAffectedByExtremeWeather(
      schools,
      startDate,
      endDate,
    );
    const attendanceDeviation = await this.calculateAttendanceDeviation(
      organizationId,
      new Date(startDate),
      new Date(endDate),
      dailyRain,
    );

    return {
      avgRainfall: Number(avgRainfall.toFixed(1)),
      extremeWeatherDays,
      schoolsAffected,
      attendanceDeviation: Number(attendanceDeviation.toFixed(1)),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. RAINFALL TRENDS (Weekly aggregation with attendance)
  // ═══════════════════════════════════════════════════════════════════════

  async getRainfallTrends(
    organizationId: string,
    weeks: number = 8,
  ): Promise<RainfallTrendData[]> {
    this.logger.log(`Fetching rainfall trends for ${weeks} weeks`);

    const schools = await this.getSchoolsWithCoordinates(organizationId);
    if (schools.length === 0) return [];

    const { avgLat, avgLon } = this.calculateCenterPoint(schools);
    const { startDate, endDate } = this.getDateRange(weeks * 7);

    const weatherData = await this.fetchHistoricalWeather(
      avgLat,
      avgLon,
      startDate,
      endDate,
    );

    const dailyRain = weatherData.daily.precipitation_sum || [];
    const dailyTemp = weatherData.daily.temperature_2m_max || [];
    const dates = weatherData.daily.time || [];

    const weeklyData: RainfallTrendData[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = i * 7;
      const weekEnd = Math.min(weekStart + 7, dailyRain.length);

      if (weekEnd <= weekStart) break;

      const weekRainfall = dailyRain
        .slice(weekStart, weekEnd)
        .reduce((sum, val) => sum + val, 0);
      const weekTemp =
        dailyTemp.slice(weekStart, weekEnd).reduce((sum, val) => sum + val, 0) /
        (weekEnd - weekStart);

      const weekStartDate = new Date(dates[weekStart]);
      const weekEndDate = new Date(dates[weekEnd - 1]);
      const attendance = await this.getAttendanceRate(
        organizationId,
        weekStartDate,
        weekEndDate,
      );

      weeklyData.push({
        date: `Week ${i + 1}`,
        rainfall: Number(weekRainfall.toFixed(1)),
        attendance: Number(attendance.toFixed(1)),
        avgTemp: Number(weekTemp.toFixed(1)),
      });
    }

    return weeklyData;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. ATTENDANCE CORRELATION DATA
  // ═══════════════════════════════════════════════════════════════════════

  async getAttendanceCorrelation(
    organizationId: string,
    days: number = 90,
  ): Promise<AttendanceCorrelationData[]> {
    this.logger.log(`Calculating attendance correlation for ${days} days`);

    const schools = await this.getSchoolsWithCoordinates(organizationId);
    if (schools.length === 0) return [];

    const { avgLat, avgLon } = this.calculateCenterPoint(schools);
    const { startDate, endDate } = this.getDateRange(days);

    const weatherData = await this.fetchHistoricalWeather(
      avgLat,
      avgLon,
      startDate,
      endDate,
    );

    const dailyRain = weatherData.daily.precipitation_sum || [];
    const dates = weatherData.daily.time || [];

    const correlationData: AttendanceCorrelationData[] = [];

    // Sample every 3 days to reduce data points (30 points for 90 days)
    for (let i = 0; i < dailyRain.length; i += 3) {
      const date = new Date(dates[i]);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const attendance = await this.getAttendanceRate(
        organizationId,
        date,
        nextDate,
      );
      const rainfall = dailyRain[i];

      correlationData.push({
        rainfall: Number(rainfall.toFixed(1)),
        attendance: Number(attendance.toFixed(1)),
        label: this.getRainfallLabel(rainfall),
      });
    }

    return correlationData;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. SCHOOL-LEVEL WEATHER IMPACT
  // ═══════════════════════════════════════════════════════════════════════

  async getSchoolWeatherImpact(
    organizationId: string,
    days: number = 30,
  ): Promise<SchoolImpactData[]> {
    this.logger.log(`Calculating school weather impact for ${days} days`);

   const schools = await this.schoolRepo
  .createQueryBuilder('school')
  .innerJoin('organization_schools', 'os', 'os.school_id = school.school_id')
  .where('os.organization_id = :organizationId', { organizationId })
  .andWhere('school.is_active = true')
  .getMany();

    const { startDate, endDate } = this.getDateRange(days);
    const impacts: SchoolImpactData[] = [];

    for (const school of schools) {
      if (!school.latitude || !school.longitude) continue;

      const weatherData = await this.fetchHistoricalWeather(
        school.latitude,
        school.longitude,
        startDate,
        endDate,
      );

      const dailyRain = weatherData.daily.precipitation_sum || [];
      const dates = weatherData.daily.time || [];

      const extremeDays = dailyRain
        .map((rain, i) => ({ rain, date: dates[i] }))
        .filter((d) => d.rain > 5);

      if (extremeDays.length === 0) continue;

      const normalAttendance = await this.getAttendanceRate(
        organizationId,
        new Date(startDate),
        new Date(endDate),
        school.schoolId,
      );

      let extremeAttendanceTotal = 0;
      for (const day of extremeDays) {
        const dayDate = new Date(day.date);
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);
        extremeAttendanceTotal += await this.getAttendanceRate(
          organizationId,
          dayDate,
          nextDay,
          school.schoolId,
        );
      }
      const extremeAttendance = extremeAttendanceTotal / extremeDays.length;

      const attendanceChange = extremeAttendance - normalAttendance;
      const maxRain = Math.max(...dailyRain);

      const { weatherEvent, severity } = this.categorizeWeatherEvent(maxRain);
      const performanceImpact = this.categorizePerformanceImpact(
        Math.abs(attendanceChange),
      );

      impacts.push({
        schoolId: school.schoolId,
        schoolName: school.name,
        location:
          school.address || `${school.city}, ${school.state}` || 'Unknown',
        weatherEvent,
        attendanceChange: Number(attendanceChange.toFixed(1)),
        performanceImpact,
        daysAffected: extremeDays.length,
        severity,
      });
    }

    return impacts.sort((a, b) => a.attendanceChange - b.attendanceChange);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. SEASONAL PATTERNS
  // ═══════════════════════════════════════════════════════════════════════

  async getSeasonalPatterns(
    organizationId: string,
  ): Promise<SeasonalPattern[]> {
    this.logger.log(`Fetching seasonal patterns`);

    const schools = await this.getSchoolsWithCoordinates(organizationId);
    if (schools.length === 0) return [];

    const { avgLat, avgLon } = this.calculateCenterPoint(schools);

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const weather2023 = await this.fetchHistoricalWeather(
      avgLat,
      avgLon,
      `${lastYear}-01-01`,
      `${lastYear}-12-31`,
    );
    const weather2024 = await this.fetchHistoricalWeather(
      avgLat,
      avgLon,
      `${currentYear}-01-01`,
      new Date().toISOString().split('T')[0],
    );

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const patterns: SeasonalPattern[] = [];

    const currentMonth = new Date().getMonth();

    for (let month = 0; month <= currentMonth; month++) {
      const monthData2023 = this.getMonthlyAverage(weather2023, month);
      const monthData2024 = this.getMonthlyAverage(weather2024, month);

      const attendanceLastYear = await this.getMonthlyAttendance(
        organizationId,
        lastYear,
        month,
      );
      const attendanceCurrentYear = await this.getMonthlyAttendance(
        organizationId,
        currentYear,
        month,
      );

      patterns.push({
        month: months[month],
        rainfallLastYear: monthData2023,
        rainfallCurrentYear: monthData2024,
        attendanceLastYear,
        attendanceCurrentYear,
      });
    }

    return patterns;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════

  private async getSchoolsWithCoordinates(
    organizationId: string,
  ): Promise<School[]> {
return this.schoolRepo
  .createQueryBuilder('school')
  .innerJoin('organization_schools', 'os', 'os.school_id = school.school_id')
  .where('os.organization_id = :organizationId', { organizationId })
  .andWhere('school.is_active = true')
  .select(['school.schoolId', 'school.name', 'school.latitude', 'school.longitude', 'school.address', 'school.city', 'school.state'])
  .getMany();}

  private calculateCenterPoint(schools: School[]): {
    avgLat: number;
    avgLon: number;
  } {
    const validSchools = schools.filter((s) => s.latitude && s.longitude);
    const avgLat =
      validSchools.reduce((sum, s) => sum + s.latitude, 0) /
      validSchools.length;
    const avgLon =
      validSchools.reduce((sum, s) => sum + s.longitude, 0) /
      validSchools.length;
    return { avgLat, avgLon };
  }

  private getDateRange(days: number): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  private async fetchHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string,
  ): Promise<WeatherApiResponse> {
    const url = `${this.ARCHIVE_URL}?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<WeatherApiResponse>(url),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Weather API error: ${error}`);
      return {
        daily: {
          precipitation_sum: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          time: [],
        },
      };
    }
  }

  private async getAttendanceRate(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    schoolId?: string,
  ): Promise<number> {
    const query: any = {
      organizationId,
      attendanceDate: Between(startDate, endDate),
    };

    if (schoolId) query.schoolId = schoolId;

    const records = await this.attendanceRepo.find({ where: query });

    if (records.length === 0) return 0;

    const present = records.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    return (present / records.length) * 100;
  }

  private async countSchoolsAffectedByExtremeWeather(
    schools: School[],
    startDate: string,
    endDate: string,
  ): Promise<number> {
    let count = 0;
    for (const school of schools) {
      if (!school.latitude || !school.longitude) continue;

      const weatherData = await this.fetchHistoricalWeather(
        school.latitude,
        school.longitude,
        startDate,
        endDate,
      );

      const hasExtreme = (weatherData.daily.precipitation_sum || []).some(
        (rain) => rain > 50,
      );
      if (hasExtreme) count++;
    }
    return count;
  }

  private async calculateAttendanceDeviation(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    dailyRain: number[],
  ): Promise<number> {
    if (dailyRain.length === 0) return 0;

    const normalAttendance = await this.getAttendanceRate(
      organizationId,
      startDate,
      endDate,
    );

    // Simplified calculation - assumes extreme weather days have lower attendance
    const extremeDays = dailyRain.filter((r) => r >= 40).length;
    if (extremeDays === 0) return 0;

    // Estimate: each extreme day reduces attendance by ~1.5%
    const estimatedDeviation = -(extremeDays * 1.5);
    return Math.max(estimatedDeviation, -15); // Cap at -15%
  }

  private getMonthlyAverage(
    weatherData: WeatherApiResponse,
    month: number,
  ): number {
    const dates = weatherData.daily.time || [];
    const rainfall = weatherData.daily.precipitation_sum || [];

    const monthlyData = rainfall.filter((_, i) => {
      const date = new Date(dates[i]);
      return date.getMonth() === month;
    });

    if (monthlyData.length === 0) return 0;
    return Number(this.calculateAverage(monthlyData).toFixed(1));
  }

  private async getMonthlyAttendance(
    organizationId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return this.getAttendanceRate(organizationId, startDate, endDate);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private getRainfallLabel(rainfall: number): string {
    if (rainfall > 60) return 'Severe';
    if (rainfall > 40) return 'Heavy';
    if (rainfall > 25) return 'Moderate';
    return 'Light';
  }

  private categorizeWeatherEvent(maxRain: number): {
    weatherEvent: string;
    severity: 'low' | 'medium' | 'high';
  } {
    if (maxRain > 80) return { weatherEvent: 'Flooding', severity: 'high' };
    if (maxRain > 60) return { weatherEvent: 'Storm', severity: 'high' };
    if (maxRain > 40)
      return { weatherEvent: 'Heavy Rainfall', severity: 'medium' };
    if (maxRain > 25)
      return { weatherEvent: 'Moderate Rain', severity: 'medium' };
    return { weatherEvent: 'Light Rain', severity: 'low' };
  }

  private categorizePerformanceImpact(absChange: number): string {
    if (absChange > 15) return 'Significant';
    if (absChange > 10) return 'Moderate';
    if (absChange > 5) return 'Minimal';
    return 'None';
  }

  private getEmptyMetrics(): WeatherMetrics {
    return {
      avgRainfall: 0,
      extremeWeatherDays: 0,
      schoolsAffected: 0,
      attendanceDeviation: 0,
    };
  }
}
