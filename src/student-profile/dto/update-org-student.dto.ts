// src/student-profile/dto/update-org-student.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsEnum,
} from 'class-validator';

export class UpdateOrgStudentDto {
  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  riskLevel?: string;

  @IsEnum(['active', 'graduated', 'withdrawn', 'transferred'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  enrollmentDate?: Date;

  @IsString()
  @IsOptional()
  assignedMentorId?: string;

  @IsObject()
  @IsOptional()
  interventions?: Record<string, any>;

  @IsObject()
  @IsOptional()
  orgSpecificNotes?: {
    beneficiaryId?: string;
    programType?: string;
    specialNeeds?: string[];
    parentConsent?: boolean;
    notes?: string;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}