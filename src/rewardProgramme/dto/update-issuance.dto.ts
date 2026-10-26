// update-issuance.dto.ts
import { IsEnum, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';
import { IssuanceStatus } from './create-issuance.dto';

export class UpdateIssuanceDto {
  @IsOptional()
  @IsEnum(IssuanceStatus)
  status?: IssuanceStatus;

  @IsOptional()
  @IsNumber()
  outcomeChange?: number;

  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;
}