import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import {
  AttendanceMode,
  AttendanceStatus,
  AttendanceSyncStatus,
  DeviceType,
} from '../../common/enum/attendance.enums';
import { TermType } from '../../common/enum/term-type.enum';

export class CreateStudentAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  schoolId: string;

  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  @IsOptional()
  markedByUserId?: string;

  @IsUUID()
  @IsOptional()
  calendarId?: string;

  /** YYYY-MM-DD */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'attendanceDate must be YYYY-MM-DD',
  })
  attendanceDate: string;

  @IsEnum(AttendanceMode)
  mode: AttendanceMode;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsEnum(TermType)
  currentTerm: TermType;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsEnum(DeviceType)
  @IsOptional()
  deviceType?: DeviceType;
}
