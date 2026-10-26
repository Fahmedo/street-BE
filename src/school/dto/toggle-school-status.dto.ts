// dto/toggle-school-status.dto.ts
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleSchoolStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}