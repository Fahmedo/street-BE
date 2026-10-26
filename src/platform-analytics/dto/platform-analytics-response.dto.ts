// dto/platform-analytics-response.dto.ts

export interface KeyInsight {
  label: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  sublabel: string;
}

export interface TrendDataPoint {
  month: string;
  rate?: number;
  submissions?: number;
}

export interface OrgComparisonData {
  name: string;
  attendance: number;
  schoolCount: number;
  studentCount: number;
}

export interface SeasonalPattern {
  title: string;
  value: string;
  description: string;
  trend: 'positive' | 'negative' | 'neutral';
  metadata?: Record<string, any>;
}

export class PlatformAnalyticsResponseDto {
  keyInsights: KeyInsight[];
  attendanceTrends: TrendDataPoint[];
  orgTypeComparison: OrgComparisonData[];
  seasonalPatterns: SeasonalPattern[];
  metadata: {
    totalOrganizations: number;
    totalSchools: number;
    totalStudents: number;
    activeSubmissions: number;
    dataStartDate: string;
    dataEndDate: string;
    generatedAt: Date;
  };
}