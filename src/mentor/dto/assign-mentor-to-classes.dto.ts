// src/mentor/dto/assign-mentor-to-classes.dto.ts
import { IsUUID, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMentorToClassesDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Mentor user ID',
  })
  @IsUUID()
  @IsNotEmpty()
  mentorId: string;

  @ApiProperty({
    example: [
      '123e4567-e89b-12d3-a456-426614174010',
      '123e4567-e89b-12d3-a456-426614174011',
    ],
    description: 'Array of class IDs (must belong to same school)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  classIds: string[];
}