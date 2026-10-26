// platform-reports/dto/platform-reports-response.dto.ts


// ─── All Users / Roles Summary ────────────────────────────────────────────────
export class UsersReportSummary {
  totalUsers: number;
  activeUsers: number;              // logged in within period
  inactiveUsers: number;
  newUsersThisPeriod: number;
  byRole: UserRoleStat[];
  byOrganisation: UserOrgStat[];
  byStatus: UserStatusStat[];
}

export class UserRoleStat {
  role: string;                     // MENTOR | SCHOOL_ADMIN | ORG_ADMIN etc.
  count: number;
  activeCount: number;
  percentage: number;
}

export class UserOrgStat {
  organizationId: string;
  organizationName: string;
  totalUsers: number;
  activeUsers: number;
  mentors: number;
  schoolAdmins: number;
  orgAdmins: number;
  otherRoles: number;
}

export class UserStatusStat {
  status: string;                   // ACTIVE | PENDING | SUSPENDED
  count: number;
  percentage: number;
}
// ─── School Admins ────────────────────────────────────────────────────────────
export class SchoolAdminReportSummary {
  totalSchoolAdmins: number;
  activeSchoolAdmins: number;          // logged in within period
  inactiveSchoolAdmins: number;
  newSchoolAdminsThisPeriod: number;
  avgSchoolsPerAdmin: number;
  byOrganisation: SchoolAdminOrgStat[];
  inactive: InactiveSchoolAdmin[];
}

export class SchoolAdminOrgStat {
  organizationId: string;
  organizationName: string;
  schoolAdminCount: number;
  activeCount: number;
  totalSchoolsAssigned: number;
}

export class InactiveSchoolAdmin {
  userId: string;
  name: string;
  email: string;
  organizationName: string;
  lastLogin: Date | null;
  assignedSchools: number;
}
// ─── Attendance ───────────────────────────────────────────────────────────────
export class AttendanceReportSummary {
  overallRate: number;              // platform-wide attendance %
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  trend: AttendanceTrendPoint[];
  byOrganisation: OrgAttendanceStat[];
  lowestSchools: SchoolAttendanceStat[];
}

export class AttendanceTrendPoint {
  period: string;   // day / week label
  rate: number;
}

export class OrgAttendanceStat {
  organizationId: string;
  organizationName: string;
  rate: number;
  totalRecords: number;
}

export class SchoolAttendanceStat {
  schoolId: string;
  schoolName: string;
  organizationName: string;
  rate: number;
  totalStudents: number;
}

// ─── Organisations ────────────────────────────────────────────────────────────
export class OrganisationReportSummary {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  newThisPeriod: number;
  byState: OrgByState[];
  topPerforming: OrgPerformanceStat[];
}

export class OrgByState {
  state: string;
  count: number;
}

export class OrgPerformanceStat {
  organizationId: string;
  organizationName: string;
  attendanceRate: number;
  totalStudents: number;
  totalSchools: number;
  totalMentors: number;
}

// ─── Students ─────────────────────────────────────────────────────────────────
export class StudentReportSummary {
  total: number;
  active: number;
  inactive: number;
  newEnrollments: number;        // enrolled in period
  byRiskLevel: RiskLevelStat[];
  byPerformanceStatus: PerformanceStat[];
  byGender: GenderStat[];
  atRisk: AtRiskStudent[];       // red risk level
}

export class RiskLevelStat {
  level: string;    // green | amber | red
  count: number;
  percentage: number;
}

export class PerformanceStat {
  status: string;   // good | fair | poor
  count: number;
  percentage: number;
}

export class GenderStat {
  gender: string;
  count: number;
  percentage: number;
}

export class AtRiskStudent {
  studentId: string;
  name: string;
  schoolName: string;
  organizationName: string;
  riskLevel: string;
  performanceStatus: string;
}

// ─── Mentors / Users ─────────────────────────────────────────────────────────
export class MentorReportSummary {
  totalMentors: number;
  activeMentors: number;          // logged in within period
  inactiveMentors: number;
  totalAdminUsers: number;        // org admins
  newMentorsThisPeriod: number;
  avgStudentsPerMentor: number;
  byOrganisation: MentorOrgStat[];
  inactive: InactiveMentor[];
}

export class MentorOrgStat {
  organizationId: string;
  organizationName: string;
  mentorCount: number;
  activeCount: number;
  totalStudentsAssigned: number;
}

export class InactiveMentor {
  userId: string;
  name: string;
  email: string;
  organizationName: string;
  lastLogin: Date | null;
  assignedStudents: number;
}

// ─── Interventions ────────────────────────────────────────────────────────────
export class InterventionReportSummary {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  followUpRequired: number;
  completionRate: number;           // completed / total %
  byType: InterventionTypeStat[];
  byPriority: InterventionPriorityStat[];
  byOrganisation: InterventionOrgStat[];
  trend: InterventionTrendPoint[];
}

export class InterventionTypeStat {
  type: string;
  count: number;
}

export class InterventionPriorityStat {
  priority: string;
  count: number;
}

export class InterventionOrgStat {
  organizationId: string;
  organizationName: string;
  total: number;
  completionRate: number;
}

export class InterventionTrendPoint {
  period: string;
  created: number;
  completed: number;
}

// ─── Rewards ─────────────────────────────────────────────────────────────────
export class RewardReportSummary {
  totalProgrammes: number;
  activeProgrammes: number;
  totalIssuances: number;
  approvedIssuances: number;
  pendingIssuances: number;
  approvalRate: number;            // approved / total %
  byType: RewardTypeStat[];
  byOrganisation: RewardOrgStat[];
  topRecipientSchools: TopRewardSchool[];
}

export class RewardTypeStat {
  rewardType: string;   // cash | resources | certificate | other
  count: number;
}

export class RewardOrgStat {
  organizationId: string;
  organizationName: string;
  programmesCount: number;
  issuancesCount: number;
}

export class TopRewardSchool {
  schoolId: string;
  schoolName: string;
  organizationName: string;
  issuancesCount: number;
  avgAttendanceRate: number;
}

// ─── Audit / Security ─────────────────────────────────────────────────────────
export class AuditReportSummary {
  totalActions: number;
  uniqueUsers: number;
  byPlatform: PlatformStat[];
  byAction: ActionStat[];
  loginCount: number;
  passwordResets: number;
  suspensions: number;
  deletions: number;
  activityTrend: AuditTrendPoint[];
}

export class PlatformStat {
  platform: string;   // Web | Mobile | API
  count: number;
  percentage: number;
}

export class ActionStat {
  action: string;
  count: number;
}

export class AuditTrendPoint {
  period: string;
  count: number;
}

// ─── Root response ────────────────────────────────────────────────────────────
export class PlatformReportsResponseDto {
  attendance: AttendanceReportSummary;
  organisations: OrganisationReportSummary;
  students: StudentReportSummary;
  mentors: MentorReportSummary;
   schoolAdmins: SchoolAdminReportSummary;
   users: UsersReportSummary;
  interventions: InterventionReportSummary;
  rewards: RewardReportSummary;
  audit: AuditReportSummary;
  metadata: {
    generatedAt: Date;
    timeRange: string;
    dataStartDate: string;
    dataEndDate: string;
    appliedFilters: {
      state?: string;
      organizationId?: string;
      academicYear?: string;
    };
  };
}