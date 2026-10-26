// src/promotions/dto/promote-student.dto.ts
import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromoteStudentDto {
  @ApiProperty({
    example: 'uuid-class-2',
    description: 'Class to promote student into. Omit if graduating (terminal).',
  })
  @IsUUID()
  @IsOptional()
  toClassId?: string;

  @ApiProperty({
    example: '2024/2025',
    description: 'Academic year for the promotion',
  })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({
    example: 'Early promotion due to exceptional performance',
    description: 'Optional notes for the promotion',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}