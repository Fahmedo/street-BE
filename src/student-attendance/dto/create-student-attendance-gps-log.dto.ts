import { IsNumber, IsOptional } from 'class-validator';

export class CreateStudentAttendanceGpsLogDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracyMeters?: number;
}
