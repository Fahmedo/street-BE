// src/promotions/dto/bulk-promote.dto.ts
import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkPromoteDto {
  @ApiProperty({
    example: '2024/2025',
    description: 'Academic year being closed',
  })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({
    example: 'uuid-school-1',
    description: 'Promote only this school. Omit to promote all schools.',
  })
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional({
    example: 'End of year promotion',
    description: 'Optional notes for the promotion',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}