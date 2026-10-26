// platform-demographics-response.dto.ts

export interface DemographicsStatCard {
  label: string;
  value: string | number;
  sublabel: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export interface AgeDistributionData {
  age: string;
  students: number;
  attendance?: number;
}

export interface GenderDistributionData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface RegionalData {
  region: string;
  state?: string;
  students: number;
  attendance: number;
  schoolCount: number;
}

export interface AttendanceByDemographic {
  category: string; // Age band or gender
  rate: number;
  students: number;
}

export interface EquityRadarData {
  dimension: string;
  female: number;
  male: number;
}

export interface EquityInsight {
  type: 'positive' | 'info' | 'warning' | 'negative';
  title: string;
  description: string;
}

export class PlatformDemographicsResponseDto {
  keyStats: DemographicsStatCard[];
  
  ageDistribution: AgeDistributionData[];
  
  genderDistribution: GenderDistributionData[];
  
  regionalData: RegionalData[];
  
  attendanceByAge: AttendanceByDemographic[];
  
  attendanceByGender: AttendanceByDemographic[];
  
  equityRadarData: EquityRadarData[];
  
  equityInsights: EquityInsight[];
  
  metadata: {
    totalStudents: number;
    regionsCovered: number;
    genderBalanceRatio: string;
    ageRange: string;
    dataStartDate: string;
    dataEndDate: string;
    generatedAt: Date;
  };
}