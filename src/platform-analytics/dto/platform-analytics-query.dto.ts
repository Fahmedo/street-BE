// dto/platform-analytics-query.dto.ts
import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum TimeRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
  LAST_12_MONTHS = 'last_12_months',
  CURRENT_YEAR = 'current_year',
  CUSTOM = 'custom',
}

export enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
}

export class PlatformAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.LAST_6_MONTHS;

  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy = GroupBy.MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  organizationType?: string; // Filter by org type

  @IsOptional()
  @IsString()
  state?: string; // Filter by state
}