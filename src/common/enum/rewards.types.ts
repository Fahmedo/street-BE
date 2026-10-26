// ─── Enums ────────────────────────────────────────────────────────────────────
export type ProgrammeType       = 'school' | 'family';
export type ProgrammeStatus     = 'active' | 'draft' | 'paused' | 'completed';
export type ProgrammePeriod     = 'weekly' | 'monthly' | 'term';
export type RewardType          = 'cash' | 'resources' | 'certificate' | 'other';
export type DistributionMethod  = 'manual' | 'automatic';
export type EligibilityScope    = 'organisation' | 'selected';
export type RecipientType       = 'school' | 'family';
export type IssuanceStatus      = 'issued' | 'pending' | 'approved' | 'cancelled';
export type EligibilityStatus   = 'eligible' | 'pending' | 'not-eligible';

// ─── Programme ────────────────────────────────────────────────────────────────
export interface RewardProgramme {
  programmeId:           string;
  name:                  string;
  description?:          string;
  type:                  ProgrammeType;
  status:                ProgrammeStatus;
  period:                ProgrammePeriod;
  attendanceThreshold?:  number;
  performanceThreshold?: number;
  improvementBased:      boolean;
  minimumDataDays:       number;
  rewardType:            RewardType;
  rewardValue?:          string;
  rewardDescription?:    string;
  distributionMethod:    DistributionMethod;
  eligibilityScope:      EligibilityScope;
  budgetCap?:            number;
  startDate:             string;
  endDate?:              string;
  eligibleCount:         number;
  issuedCount:           number;
  createdAt:             string;
}

// ─── Issuance ─────────────────────────────────────────────────────────────────
export interface RewardIssuance {
  issuanceId:                string;
  programmeId:               string;
  programmeName:             string;
  rewardType:                string;
  recipientType:             RecipientType;
  recipientName:             string;
  schoolId?:                 string;
  studentId?:                string;
  status:                    IssuanceStatus;
  attendanceRateSnapshot?:   number;
  attendanceChangeSnapshot?: number;
  performanceScoreSnapshot?: number;
  periodLabel?:              string;
  valueLabel?:               string;
  outcomeChange?:            number;
  approvedBy?:               string;
  issuedAt?:                 string;
  createdAt:                 string;
}

// ─── Eligibility ──────────────────────────────────────────────────────────────
export interface EligibleSchool {
  schoolId:          string;
  schoolName:        string;
  attendanceRate:    number;
  attendanceChange:  number;
  performanceScore:  number;
  eligibilityStatus: EligibilityStatus;
  rewardType:        string;
  programmeId:       string;
}

export interface EligibleFamily {
  studentId:         string;
  studentName:       string;
  schoolName:        string;
  guardianMasked:    string;
  attendanceRate:    number;
  attendanceChange:  number;
  performanceStatus: string;
  eligibilityStatus: EligibilityStatus;
  rewardType:        string;
  programmeId:       string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface RewardsDashboardStats {
  activeProgrammes:       number;
  eligibleSchools:        number;
  eligibleFamilies:       number;
  rewardsIssued:          number;
  attendanceImprovement:  number;
  performanceImprovement: number;
  totalValueDistributed:  string;
  rewardCompletionRate:   number;
}

export interface RewardsDashboard {
  stats:             RewardsDashboardStats;
  activeProgrammes:  RewardProgramme[];
  recentIssuances:   RewardIssuance[];
}

// ─── Request payloads ─────────────────────────────────────────────────────────
export interface CreateProgrammePayload {
  name:                  string;
  description?:          string;
  type:                  ProgrammeType;
  period:                ProgrammePeriod;
  attendanceThreshold?:  number;
  performanceThreshold?: number;
  improvementBased:      boolean;
  minimumDataDays?:      number;
  rewardType:            RewardType;
  rewardValue?:          string;
  rewardDescription?:    string;
  distributionMethod:    DistributionMethod;
  eligibilityScope:      EligibilityScope;
  budgetCap?:            number;
  startDate:             string;
  endDate?:              string;
  schoolIds?:            string[];   // only when eligibilityScope = 'selected'
}

export interface UpdateProgrammePayload extends Partial<CreateProgrammePayload> {
  status?: ProgrammeStatus;
}

export interface CreateIssuancePayload {
  programmeId:               string;
  recipientType:             RecipientType;
  schoolId?:                 string;
  studentId?:                string;
  attendanceRateSnapshot?:   number;
  attendanceChangeSnapshot?: number;
  performanceScoreSnapshot?: number;
  periodLabel?:              string;
  valueLabel?:               string;
}

export interface UpdateIssuancePayload {
  status?:        IssuanceStatus;
  outcomeChange?: number;
  approvedBy?:    string;
  issuedAt?:      string;
}

// ─── Query params ─────────────────────────────────────────────────────────────
export interface QueryProgrammesParams {
  status?:     ProgrammeStatus;
  type?:       ProgrammeType;
  searchTerm?: string;
  page?:       number;
  perPage?:    number;
}

export interface QueryIssuancesParams {
  programmeId?:  string;
  status?:       IssuanceStatus;
  recipientType?: RecipientType;
  schoolId?:     string;
  studentId?:    string;
  periodLabel?:  string;
  page?:         number;
  perPage?:      number;
}

// ─── Common ───────────────────────────────────────────────────────────────────
export interface RewardsCommonResponse {
  message: string;
}

export interface PaginatedIssuances {
  items: RewardIssuance[];
  meta: {
    currentPage:     number;
    itemsPerPage:    number;
    totalItems:      number;
    totalPages:      number;
    hasPreviousPage: boolean;
    hasNextPage:     boolean;
  };
}

export interface PaginatedProgrammes {
  items: RewardProgramme[];
  meta: {
    currentPage:     number;
    itemsPerPage:    number;
    totalItems:      number;
    totalPages:      number;
    hasPreviousPage: boolean;
    hasNextPage:     boolean;
  };
}