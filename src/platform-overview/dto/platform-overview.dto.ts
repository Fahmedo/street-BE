// src/platform-overview/dto/platform-overview.dto.ts

import { IsOptional, IsEnum } from 'class-validator';

export enum PlatformDateRangeFilter {
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  THIS_YEAR = 'this_year',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  ALL_TIME = 'all_time',
}

export class PlatformOverviewQueryDto {
  @IsOptional()
  @IsEnum(PlatformDateRangeFilter)
  range?: PlatformDateRangeFilter;
}

// ─── RESPONSE DTOs ───────────────────────────────────────────────────────

export interface PlatformMetricsDto {
  totalOrganizations: number;
  totalSchools: number;
  totalStudents: number;
  avgAttendanceRate: number;
  organizationsChange: string;
  schoolsChange: string;
  studentsChange: string;
  attendanceChange: string;
}

export interface OrganizationStatusDto {
  active: number;
  pendingSetup: number;
  suspended: number;
  total: number;
}

export interface GrowthDataPointDto {
  month: string;
  orgs: number;
  schools: number;
  students: number;
}

export interface AttendanceDataPointDto {
  week: string;
  rate: number;
}

export interface RecentActivityDto {
  id: string;
  type: 'new' | 'update' | 'alert';
  message: string;
  time: string;
  timestamp: Date;
}

export interface PlatformOverviewResponseDto {
  message: string;
  metrics: PlatformMetricsDto;
  organizationStatus?: OrganizationStatusDto;
  growthData: GrowthDataPointDto[];
  attendanceData: AttendanceDataPointDto[];
  recentActivity: RecentActivityDto[];
}