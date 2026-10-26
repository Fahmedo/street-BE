// platform-reports/dto/platform-reports-query.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReportTimeRange {
  LAST_7_DAYS   = '7d',
  LAST_30_DAYS  = '30d',
  LAST_3_MONTHS = '3m',
  LAST_6_MONTHS = '6m',
  LAST_12_MONTHS = '12m',
  CURRENT_YEAR  = 'year',
}

export class PlatformReportsQueryDto {
  @IsOptional()
  @IsEnum(ReportTimeRange)
  timeRange?: ReportTimeRange = ReportTimeRange.LAST_30_DAYS;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}