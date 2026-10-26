// platform-demographics-query.dto.ts
import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum DemographicsTimeRange {
  LAST_30_DAYS = 'last_30_days',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
  LAST_12_MONTHS = 'last_12_months',
  CURRENT_YEAR = 'current_year',
  CUSTOM = 'custom',
}

export enum DemographicsGroupBy {
  AGE_BAND = 'age_band',
  GENDER = 'gender',
  REGION = 'region',
  STATE = 'state',
}

export class PlatformDemographicsQueryDto {
  @IsOptional()
  @IsEnum(DemographicsTimeRange)
  timeRange?: DemographicsTimeRange = DemographicsTimeRange.LAST_6_MONTHS;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsEnum(DemographicsGroupBy)
  groupBy?: DemographicsGroupBy = DemographicsGroupBy.REGION;
}