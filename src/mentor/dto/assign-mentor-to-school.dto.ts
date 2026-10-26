// src/mentor/dto/assign-mentor-to-school.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMentorToSchoolDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Mentor user ID',
  })
  @IsUUID()
  @IsNotEmpty()
  mentorId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'School ID',
  })
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;
}