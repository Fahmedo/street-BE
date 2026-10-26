// update-programme.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProgrammeDto } from './create-programme.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ProgrammeStatus } from './create-programme.dto';

export class UpdateProgrammeDto extends PartialType(CreateProgrammeDto) {
  @IsOptional()
  @IsEnum(ProgrammeStatus)
  status?: ProgrammeStatus;
}