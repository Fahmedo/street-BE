// create-programme.dto.ts
import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsArray,
  IsUUID,
} from 'class-validator';

export enum ProgrammeType {
  SCHOOL = 'school',
  FAMILY = 'family',
}
export enum ProgrammeStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}
export enum ProgrammePeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  TERM = 'term',
}
export enum RewardType {
  CASH = 'cash',
  RESOURCES = 'resources',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}
export enum DistributionMethod {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
}
export enum EligibilityScope {
  ORGANISATION = 'organisation',
  SELECTED = 'selected',
}

export class CreateProgrammeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProgrammeType)
  type: ProgrammeType;

  @IsEnum(ProgrammePeriod)
  period: ProgrammePeriod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  attendanceThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  performanceThreshold?: number;

  @IsBoolean()
  improvementBased: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumDataDays?: number;

  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsOptional()
  @IsString()
  rewardValue?: string;

  @IsOptional()
  @IsString()
  rewardDescription?: string;

  @IsEnum(DistributionMethod)
  distributionMethod: DistributionMethod;

  @IsEnum(EligibilityScope)
  eligibilityScope: EligibilityScope;

  @IsOptional()
  @IsNumber()
  budgetCap?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Only used when eligibilityScope = 'selected'
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  schoolIds?: string[];

  @IsOptional()
  @IsBoolean()
  activateImmediately?: boolean;
}
