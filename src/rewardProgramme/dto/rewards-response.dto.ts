export interface ProgrammeSummaryDto {
  programmeId: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  period: string;
  attendanceThreshold?: number;
  performanceThreshold?: number;
  improvementBased: boolean;
  rewardType: string;
  rewardValue?: string;
  eligibilityScope: string;
  distributionMethod: string;
  budgetCap?: number;
  startDate: string;
  endDate?: string;
  eligibleCount: number;
  issuedCount: number;
  createdAt: string;

  calendarId?: string;
  termName?: string; // resolved from calendar relation
  termStart?: string;
  termEnd?: string;
}

export interface IssuanceSummaryDto {
  issuanceId: string;
  programmeId: string;
  programmeName: string;
  rewardType: string;
  recipientType: string;
  recipientName: string; // school name or student name
  schoolId?: string;
  studentId?: string;
  status: string;
  attendanceRateSnapshot?: number;
  attendanceChangeSnapshot?: number;
  performanceScoreSnapshot?: number;
  periodLabel?: string;
  valueLabel?: string;
  outcomeChange?: number;
  approvedBy?: string;
  issuedAt?: string;
  createdAt: string;
}

export interface EligibleSchoolDto {
  schoolId: string;
  schoolName: string;
  attendanceRate: number;
  attendanceChange: number;
  performanceScore: number;
  eligibilityStatus: 'eligible' | 'pending' | 'not-eligible';
  rewardType: string;
  programmeId: string;
}

export interface EligibleFamilyDto {
  studentId: string;
  studentName: string;
  schoolName: string;
  guardianMasked: string;
  schoolId: string;
  attendanceRate: number;
  attendanceChange: number;
  performanceStatus: string;
  eligibilityStatus: 'eligible' | 'pending' | 'not-eligible';
  rewardType: string;
  programmeId: string;
}

export interface RewardsDashboardDto {
  stats: {
    activeProgrammes: number;
    eligibleSchools: number;
    eligibleFamilies: number;
    rewardsIssued: number;
    attendanceImprovement: number;
    performanceImprovement: number;
    totalValueDistributed: string;
    rewardCompletionRate: number;
  };
  activeProgrammes: ProgrammeSummaryDto[];
  recentIssuances: IssuanceSummaryDto[];
}
