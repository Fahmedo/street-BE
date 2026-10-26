import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO for holiday objects within the calendar
export class HolidayDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(['mid_term', 'public_holiday', 'exam_period'])
  type?: 'mid_term' | 'public_holiday' | 'exam_period';
}

export class CreateSchoolCalendarDto {


  @IsString()
  @MaxLength(20)
  academicYear: string; // ✅ ADDED - e.g., "2024/2025"

  @IsString()
  termName: string; // e.g., "First Term", "Spring Term"

  @IsOptional()
  @IsInt()
  @Min(1)
  termOrder?: number; // ✅ ADDED - 1, 2, 3, etc.

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsEnum(['draft', 'active', 'completed', 'archived'])
  status?: 'draft' | 'active' | 'completed' | 'archived'; // ✅ ADDED

  @IsOptional()
  @IsString()
  description?: string; // ✅ ADDED

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[]; // ✅ ADDED

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
