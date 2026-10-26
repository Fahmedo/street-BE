import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';

export enum ReportType {
  ATTENDANCE   = 'attendance',
  REWARDS      = 'rewards',
  DEMOGRAPHICS = 'demographics',
  STUDENTS     = 'students',
  FULL         = 'full',
}

export enum ReportFormat {
  JSON  = 'json',
  EXCEL = 'excel',
}

export class QueryReportDto {
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.JSON;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  region?: string;

  @IsOptional()
  lga?: string;
}