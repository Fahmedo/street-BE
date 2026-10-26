// src/student-profile/dto/student-detail-query.dto.ts
import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StudentDetailQueryDto {
  @ApiPropertyOptional({ description: 'Start date for attendance records (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for attendance records (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Session ID to filter attendance' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}