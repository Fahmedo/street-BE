import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ✅ FIXED: Match frontend field names
class DocumentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;  // ✅ Changed from fileName

  @IsString()
  @IsNotEmpty()
  url: string;   // ✅ Changed from fileUrl

  @IsString()
  @IsNotEmpty()
  type: string;  // ✅ Changed from fileType

  @IsInt()
  size: number;  // ✅ Changed from fileSize

  // ✅ REMOVED uploadedAt - not sent from frontend
}

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  organizationName: string;

  @IsString()
  @IsNotEmpty()
  organizationType: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  shortCode: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @IsBoolean()
  nfcAttendance: boolean;

  @IsBoolean()
  photoAttendance: boolean;

  @IsBoolean()
  manualEntry: boolean;

  @IsBoolean()
  academicPerformanceTracking: boolean;

  @IsBoolean()
  weatherInsights: boolean;

  @IsBoolean()
  rewardsAndIncentives: boolean;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  // Optional fields
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactRole?: string;

  @IsOptional()
  @IsString()
  intendedUse?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)  // ✅ Add this to ensure proper conversion
  expectedSchools?: number;

  @IsOptional()
  @IsString()
  expectedStudents?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];
}