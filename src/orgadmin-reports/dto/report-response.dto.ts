// ─── Attendance ───────────────────────────────────────────────────────────────
export interface AttendanceReportDto {
  summary: {
    totalRecords:       number;
    presentCount:       number;
    absentCount:        number;
    lateCount:          number;
    overallRate:        number;
    periodStart:        string;
    periodEnd:          string;
  };
  bySchool: {
    schoolId:       string;
    schoolName:     string;
    totalRecords:   number;
    presentCount:   number;
    attendanceRate: number;
    trend:          number;
  }[];
  byMonth: {
    month:          string;
    attendanceRate: number;
    totalRecords:   number;
  }[];
  lowestPerforming: {
    schoolId:       string;
    schoolName:     string;
    attendanceRate: number;
    region:         string;
  }[];
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
export interface RewardsReportDto {
  summary: {
    totalProgrammes:     number;
    activeProgrammes:    number;
    totalIssuances:      number;
    approvedIssuances:   number;
    pendingIssuances:    number;
    cancelledIssuances:  number;
    completionRate:      number;
    avgAttendanceImpact: number;
  };
  byProgramme: {
    programmeId:   string;
    programmeName: string;
    type:          string;
    issuedCount:   number;
    eligibleCount: number;
    rewardType:    string;
  }[];
  issuancesByMonth: {
    month:  string;
    issued: number;
  }[];
  outcomeTracking: {
    withOutcome:    number;
    avgImprovement: number;
    positive:       number;
    negative:       number;
  };
}

// ─── Demographics ─────────────────────────────────────────────────────────────
export interface DemographicsReportDto {
  summary: {
    totalSchools:   number;
    totalStudents:  number;
    totalRegions:   number;
  };
  byRegion: {
    region:       string;
    schoolCount:  number;
    studentCount: number;
  }[];
  byGender: {
    male:    number;
    female:  number;
    other:   number;
  };
  bySchoolType: {
    primary:    number;
    secondary:  number;
    nonformal:  number;
  };
  enrollmentTrend: {
    month:  string;
    count:  number;
  }[];
}

// ─── Students / Risk ──────────────────────────────────────────────────────────
export interface StudentsReportDto {
  summary: {
    totalStudents:     number;
    activeStudents:    number;
    atRiskCount:       number;
    totalAlerts:       number;
    openAlerts:        number;
    resolvedAlerts:    number;
    interventionCount: number;
  };
  alertsBySeverity: {
    high:   number;
    medium: number;
    low:    number;
  };
  schoolsWithMostAlerts: {
    schoolId:    string;
    schoolName:  string;
    alertCount:  number;
    openCount:   number;
  }[];
  interventionOutcomes: {
    type:    string;
    count:   number;
  }[];
}

// ─── Full / Combined ──────────────────────────────────────────────────────────
export interface FullReportDto {
  generatedAt:  string;
  organization: string;
  attendance:   AttendanceReportDto;
  rewards:      RewardsReportDto;
  demographics: DemographicsReportDto;
  students:     StudentsReportDto;
}

// ─── Export job ───────────────────────────────────────────────────────────────
export interface ReportExportDto {
  reportType:  string;
  format:      string;
  generatedAt: string;
  downloadUrl?: string;
  data:        any;
}