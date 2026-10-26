// create-issuance.dto.ts
import { IsEnum, IsString, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';

export enum RecipientType  { SCHOOL = 'school', FAMILY = 'family' }
export enum IssuanceStatus { ISSUED = 'issued', PENDING = 'pending', APPROVED = 'approved', CANCELLED = 'cancelled' }

export class CreateIssuanceDto {
  @IsUUID()
  programmeId: string;

  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsNumber()
  attendanceRateSnapshot?: number;

  @IsOptional()
  @IsNumber()
  attendanceChangeSnapshot?: number;

  @IsOptional()
  @IsNumber()
  performanceScoreSnapshot?: number;

  @IsOptional()
  @IsString()
  periodLabel?: string;

  @IsOptional()
  @IsString()
  valueLabel?: string;

  @IsOptional()
    @IsUUID()
    calendarId?: string;
}