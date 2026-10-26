import { IsOptional, IsString } from 'class-validator';

export class StudentQueryDto {
  page?: number;
  perPage?: number;

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsString()
  riskLevel?: 'green' | 'amber' | 'red';

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  mentorId?: string;
}