import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  className: string;

  @IsInt()
  @Min(1)
  hierarchyLevel: number;

  @IsString()
  @IsOptional()
  headTeacher?: string;

  @IsBoolean()
  @IsOptional()
  isTerminal?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}