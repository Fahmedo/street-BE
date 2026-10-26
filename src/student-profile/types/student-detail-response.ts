// src/student-profile/types/student-detail-response.ts
import {
  AttendanceMode,
  AttendanceStatus,
  GpsValidationStatus,
} from '../../common/enum/attendance.enums';
import { TermType } from 'src/common/enum/term-type.enum';

export interface StudentDetailResponse {
  studentInfo: {
    studentId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    studentCode: string;
    enrollmentDate: Date;

    profilePhotoUrl?: string;
  };

  classInfo?: {
    classId: string;
    className: string;
    hierarchyLevel: number;
    headTeacherId?: string;
    isTerminal: boolean;
  };

  schoolInfo: {
    schoolId: string;
    name: string;
    code?: string;
    address?: string;
    state?: string;
    city?: string;
  };

  organizationInfo: {
    organizationId: string;
    organizationName: string;
  };

   currentCalendar?: {
    calendarId: string;
    academicYear: string;
    termName: string;
    termOrder?: number;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: 'draft' | 'active' | 'completed' | 'archived';
    holidays?: Array<{
      name: string;
      startDate: string;
      endDate: string;
      type?: 'mid_term' | 'public_holiday' | 'exam_period';
    }>;
  };

  attendanceRecords: AttendanceRecordDto[];

  attendanceStats: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
  };
}

export interface AttendanceRecordDto {
  attendanceId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  mode: AttendanceMode;
  academicYear: string;
  currentTerm: TermType;
  remark?: string;
  markedByUserId?: string;
  deviceId?: string;
  gpsValidationStatus: GpsValidationStatus;
  hasPhotos: boolean;
  hasGpsLogs: boolean;
  createdAt: Date;
}
