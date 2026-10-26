// src/intervention/dto/create-intervention.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import {
  InterventionType,
  InterventionCategory,
  InterventionStatus,
  InterventionPriority,
} from 'src/common/enum/intervention.enum';

export class CreateInterventionDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  // ✅ Optional — service will auto-detect current term if not provided
  @IsUUID()
  @IsOptional()
  calendarId?: string;

  @IsEnum(InterventionType)
  @IsNotEmpty()
  type: InterventionType;

  @IsEnum(InterventionCategory)
  @IsOptional()
  category?: InterventionCategory;

  @IsEnum(InterventionPriority)
  @IsOptional()
  priority?: InterventionPriority;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  actionTaken?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsBoolean()
  @IsOptional()
  followUpRequired?: boolean;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsEnum(InterventionStatus)
  @IsOptional()
  status?: InterventionStatus;
}