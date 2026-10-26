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
import {HolidayDto} from './create-school-calendar.dto'

export class UpdateSchoolCalendarDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  termOrder?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsEnum(['draft', 'active', 'completed', 'archived'])
  status?: 'draft' | 'active' | 'completed' | 'archived';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[];

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}