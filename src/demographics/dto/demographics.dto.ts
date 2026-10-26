import { IsEnum, IsOptional, IsString } from 'class-validator';

// ─── Query ────────────────────────────────────────────────────────────────────

export enum DemographicsDateRange {
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL = 'all',
}

export class DemographicsQueryDto {
  @IsOptional()
  @IsEnum(DemographicsDateRange)
  dateRange?: DemographicsDateRange = DemographicsDateRange.YEAR;

  /** Filter by school type: primary | secondary | nonformal */
  @IsOptional()
  @IsString()
  schoolType?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;
  /** Filter by programme/initiative ID */
  @IsOptional()
  @IsString()
  programme?: string;

  /** Filter by region (schoolId or state name) */
  @IsOptional()
  @IsString()
  region?: string;
}

// ─── Response shapes (mirror frontend data exactly) ──────────────────────────

export interface RegionDto {
  id: string;
  name: string;
  studentCount: number;
  schoolCount: number;
  initiativeCount: number;
  density: 'high' | 'medium' | 'low';
}

export interface AgeBandDto {
  band: string;
  count: number;
  percentage: number;
}

export interface GenderDto {
  name: string;
  value: number;
  percentage: number;
}

export interface SchoolTypeDto {
  name: string;
  value: number;
  percentage: number;
}

export interface InitiativeReachDto {
  initiative: string;
  students: number;
  schools: number;
  regions: number;
}

export interface GrowthTrendDto {
  month: string;   // e.g. "Jan"
  students: number;
}

export interface DemographicComparisonDto {
  region: string;
  male: number;    // percentage
  female: number;  // percentage
}

export interface DemographicsSummaryDto {
  totalStudents: number;
  totalSchools: number;
  totalRegions: number;
  totalInitiatives: number;
}

export interface DemographicsDashboardDto {
  summary: DemographicsSummaryDto;
  regions: RegionDto[];
  ageBands: AgeBandDto[];
  gender: GenderDto[];
  schoolTypes: SchoolTypeDto[];
  initiativeReach: InitiativeReachDto[];
  growthTrend: GrowthTrendDto[];
  demographicComparison: DemographicComparisonDto[];
  lastUpdatedAt: string;
}