// query-rewards.dto.ts
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProgrammeStatus, ProgrammeType } from './create-programme.dto';
import { IssuanceStatus, RecipientType } from './create-issuance.dto';

export class QueryProgrammesDto {
  @IsOptional()
  @IsEnum(ProgrammeStatus)
  status?: ProgrammeStatus;

  @IsOptional()
  @IsEnum(ProgrammeType)
  type?: ProgrammeType;

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  perPage?: number;
}

export class QueryIssuancesDto {
  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @IsOptional()
  @IsEnum(IssuanceStatus)
  status?: IssuanceStatus;

  @IsOptional()
  @IsEnum(RecipientType)
  recipientType?: RecipientType;

  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  periodLabel?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  perPage?: number;
}