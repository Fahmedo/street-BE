import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  AttendanceSyncStatus,
  AttendanceDateRange,
} from '../../common/enum/attendance.enums';

// ─── Query DTO ────────────────────────────────────────────────────────────────

export class AttendanceQueryDto {
  @IsOptional()
  @IsEnum(AttendanceDateRange)
  dateRange?: AttendanceDateRange = AttendanceDateRange.LAST_7_DAYS;

  /** Filter to a specific school by ID */
  @IsOptional()
  @IsString()
  schoolId?: string;

  /** Filter by mode substring (gps / manual / face / qr) */
  @IsOptional()
  @IsString()
  mode?: string;

  /** When true, only return records that have a GPS flag or an anomaly */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  flaggedOnly?: boolean;
}

// ─── Response shapes (match frontend AttendanceRecord interface exactly) ──────

export interface AttendanceRecordDto {
  id: string;
  date: string; // YYYY-MM-DD
  school: string; // school name
  class: string; // e.g. "Grade 5A"
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  attendanceRate: number;
  students: Array<{ name: string; code: string }>;
  modesUsed: string[]; // human-readable list e.g. ["GPS Check-in", "Manual"]
  hasGPSFlag: boolean;
  hasAnomaly: boolean;
  syncStatus: AttendanceSyncStatus;
  capturedBy: string; // mentor/user display name
  capturedAt: string; // formatted time string e.g. "08:45 AM"
}

export interface SchoolAttendanceSummaryDto {
  school: string;
  rate: number;
  present: number;
  absent: number;
}

export interface AttendanceTrendDto {
  date: string; // short day label e.g. "Mon"
  rate: number;
}

export interface AttendanceDashboardDto {
  /** Overall org-wide attendance rate (%) */
  orgAttendanceRate: number;
  /** Count of schools currently below 80% */
  schoolsBelowThreshold: number;
  /** Count of students with 3+ absences in the current period */
  studentsWithRepeatedAbsences: number;
  /** Delta vs previous equivalent period (percentage points) */
  trendVsPrevious: number;

  /** Data for the "Attendance Over Time" area chart */
  attendanceTrends: AttendanceTrendDto[];

  /** Data for the "Attendance by School" bar chart */
  schoolAttendance: SchoolAttendanceSummaryDto[];

  /** Filtered, paginated attendance records for the table */
  records: AttendanceRecordDto[];

  /** Total records before pagination (for "Showing X of Y") */
  totalRecords: number;

  /** ISO timestamp of the last sync event ingested */
  lastSyncedAt: string;
}
