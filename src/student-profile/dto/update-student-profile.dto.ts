// update-student-profile.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateStudentProfileDto } from './create-student-profile.dto';

export class UpdateStudentProfileDto extends PartialType(
  CreateStudentProfileDto,
) {}
