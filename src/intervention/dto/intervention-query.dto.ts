// src/intervention/dto/intervention-query.dto.ts
import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto';

import {
  InterventionType,
  InterventionStatus,
} from 'src/common/enum/intervention.enum';

export class InterventionQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by intervention type',
    enum: InterventionType,
    required: false,
  })
  @IsEnum(InterventionType)
  @IsOptional()
  type?: InterventionType;

  @ApiProperty({
    description: 'Filter by status',
    enum: InterventionStatus,
    required: false,
  })
  @IsEnum(InterventionStatus)
  @IsOptional()
  declare status?: InterventionStatus; 

  @ApiProperty({
    description: 'Filter by student ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({
    description: 'Filter by mentor ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  mentorId?: string;

  @ApiProperty({
    description: 'Filter by date from (YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter by date to (YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}