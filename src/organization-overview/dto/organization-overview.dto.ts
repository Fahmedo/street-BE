// src/organization-overview/dto/organization-overview.dto.ts

import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum DateRangeFilter {
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  THIS_YEAR = 'this_year',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  CUSTOM = 'custom',
}

export class OrganizationOverviewQueryDto {
  @IsOptional()
  @IsEnum(DateRangeFilter)
  range?: DateRangeFilter;

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  trendDays?: number; // For trend chart (default 7)
}

// ─── RESPONSE DTOs (same as before) ───────────────────────────────────

export interface MetricStatsDto {
  totalSchools: number;
  totalStudents: number;
  attendanceRate: number;
  avgPerformance: number;
  schoolsTrend: string;
  studentsTrend: string;
  attendanceTrend: string;
  performanceTrend: string;
  dateRange: {
    filter: string;
    startDate: string;
    endDate: string;
  };
}

export interface TrendDataPointDto {
  date: string;
  attendance: number;
  performance: number;
}

export interface SchoolComparisonDto {
  school: string;
  schoolId: string;
  attendance: number;
  performance: number;
  students: number;
}

export interface AlertDto {
  id: string;
  severity: 'high' | 'medium' | 'low';
  school: string;
  schoolId: string;
  issue: string;
  details: string;
  date: string;
}

export interface QuickStatsDto {
  atRiskStudents: number;
  gpsAnomalies: number;
  weatherAlerts: number;
}

export interface OrganizationOverviewResponseDto {
  message: string;
  stats: MetricStatsDto;
  trendData: TrendDataPointDto[];
  schoolComparison: SchoolComparisonDto[];
  alerts: AlertDto[];
  quickStats: QuickStatsDto;
}