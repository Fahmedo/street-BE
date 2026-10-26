import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformConfigurationDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() nfcAttendance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() photoAttendance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() manualEntry?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  academicPerformanceTracking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() weatherInsights?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rewardsAndIncentives?: boolean;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional({ type: () => PlatformConfigurationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformConfigurationDto)
  platformConfiguration?: PlatformConfigurationDto;
}
