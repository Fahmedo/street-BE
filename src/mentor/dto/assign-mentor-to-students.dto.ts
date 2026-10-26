// src/mentor/dto/assign-mentor-to-students.dto.ts
import { IsUUID, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMentorToStudentsDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Mentor user ID',
  })
  @IsUUID()
  @IsNotEmpty()
  mentorId: string;

  @ApiProperty({
    example: [
      '123e4567-e89b-12d3-a456-426614174020',
      '123e4567-e89b-12d3-a456-426614174021',
      '123e4567-e89b-12d3-a456-426614174022',
    ],
    description: 'Array of student IDs',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];
}