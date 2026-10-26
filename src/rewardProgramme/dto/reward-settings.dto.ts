// src/rewards/dto/reward-settings.dto.ts
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRewardsPerPeriod?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetCap?: number;

  @IsOptional()
  @IsEnum(['manual', 'automatic'])
  approvalWorkflow?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumDataDays?: number;

  @IsOptional()
  @IsBoolean()
  notifyNewEligible?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  budgetAlerts?: boolean;
}

export class SettingsResponseDto {
  settingsId: string;
  organizationId: string;
  maxRewardsPerPeriod: number;
  budgetCap: number;
  approvalWorkflow: string;
  minimumDataDays: number;
  auditTrailEnabled: boolean;
  noRetroactiveChanges: boolean;
  conflictWarningsEnabled: boolean;
  notifyNewEligible: boolean;
  weeklySummary: boolean;
  budgetAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}