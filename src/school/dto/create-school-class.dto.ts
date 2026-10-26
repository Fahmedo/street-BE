import { IsString, IsOptional, Length, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  schoolId: string;

  @IsString()
  @Length(1, 100)
  className: string;

  @IsNumber()
  @Min(1)
  hierarchyLevel: number;

  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  session?: string;
}