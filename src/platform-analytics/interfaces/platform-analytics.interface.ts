// interfaces/platform-analytics.interface.ts

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AggregatedMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalSchools: number;
  activeSchools: number;
  totalStudents: number;
  activeStudents: number;
  totalAttendanceRecords: number;
  previousPeriodAttendanceRecords: number;
  platformAttendanceRate: number;
  engagementRate: number;
  previousPeriodAttendanceRate: number;
}

export interface AttendanceRateByMonth {
  month: string;
  totalPresent: number;
  totalRecords: number;
  attendanceRate: number;
  submissionCount: number;
}

export interface OrgTypeMetrics {
  name: string;
  schoolCount: number;
  studentCount: number;
  attendanceRate: number;
}