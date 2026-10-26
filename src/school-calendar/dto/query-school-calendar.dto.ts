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

export class QuerySchoolCalendarDto {
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;


  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  termName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCurrent?: boolean;

  @IsOptional()
  @IsEnum(['draft', 'active', 'completed', 'archived'])
  status?: 'draft' | 'active' | 'completed' | 'archived';
}
