import { PaginationMetaFormat } from 'src/common/pagination/interfaces/paginated-response-interface';

// ==================== ORG ADMIN DTOs ====================

export class SchoolDashboardItemDto {
  schoolId: string;
  schoolName: string;
  code?: string;
  country: string;
  state: string;
  city: string;
  town?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  isActive?: boolean;
  schoolType?: 'primary' | 'secondary' | 'nonformal';
  totalStudents: number;
  attendanceRate: number;
  performanceRank: number;
}

export interface StudentCountRaw {
  schoolId: string;
  count: string;
}

export interface AttendanceRateRaw {
  schoolId: string;
  attendanceRate: string | null;
}

export interface AvgAttendanceRaw {
  avg: string | null;
}

export interface SchoolsDashboardResponse {
  stats: {
    totalStudents: number;
    totalSchools: number;
    avgAttendanceRate: number;
    avgPerformance: number;
  };
  schools: {
    message: string;
    items: Array<{
      schoolId: string;
      schoolName: string;
      country?: string;
      state?: string;
      city?: string;
      town?: string;

      isActive?: boolean;
      schoolType?: 'primary' | 'secondary' | 'nonformal';

      totalStudents: number;
      attendanceRate: number;
      performanceRank: number;
    }>;
    meta: PaginationMetaFormat;
    totalAmount: string;
  };
}

export interface SchoolDetailsResponse {
  schoolId: string;
  name: string;
  code?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  town?: string;
  schoolType?: 'primary' | 'secondary' | 'nonformal';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  contactPerson?: string;
  contactPhone?: string;
  logoUrl?: string;
  attendanceModes?: Record<string, boolean>;
  isActive: boolean;
  createdAt: Date;
  currentCalendar?: {
    calendarId: string;
    termName: string;
    startDate: string;
    endDate: string;
  };
  classes: Array<{
    classId: string;
    className: string;
    hierarchyLevel: number;
    isTerminal: boolean;
    isActive: boolean;
    totalStudents: number;
  }>;
}

export interface FormatSchoolDetailsResponse {
  message: string;
  data: SchoolDetailsResponse;
}

export interface ClassStudentCountRaw {
  classId: string;
  count: string;
}

// ==================== SUPER ADMIN DTOs ====================

/**
 * Response for a single global school in the list view (Super Admin)
 */
export interface GlobalSchoolListItem {
  schoolId: string;
  name: string;
  code: string;
  country: string;
  state: string;
  city: string;
   town?: string;
  schoolType?: 'primary' | 'secondary' | 'nonformal';
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  organizationsUsing: number; 
  createdAt: Date;
}

/**
 * Response for getAllGlobalSchools (Super Admin)
 */
export interface GlobalSchoolsResponse {
  message: string;
  data: {
    message: string;
    items: GlobalSchoolListItem[];
    meta: PaginationMetaFormat;
  };
}

/**
 * Response for createGlobalSchool (Super Admin)
 */
export interface CreateGlobalSchoolResponse {
  message: string;
  data: {
    schoolId: string;
    name: string;
    code: string;
    country: string;
    state: string;
    city: string;
    town?: string;
  };
}
