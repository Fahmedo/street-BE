export interface WeatherMetrics {
  avgRainfall: number;
  extremeWeatherDays: number;
  schoolsAffected: number;
  attendanceDeviation: number;
}

export interface RainfallTrendData {
  date: string;
  rainfall: number;
  attendance: number;
  avgTemp: number;
}

export interface AttendanceCorrelationData {
  rainfall: number;
  attendance: number;
  label: string;
}

export interface SchoolImpactData {
  schoolId: string;
  schoolName: string;
  location: string;
  weatherEvent: string;
  attendanceChange: number;
  performanceImpact: string;
  daysAffected: number;
  severity: 'low' | 'medium' | 'high';
}

export interface SeasonalPattern {
  month: string;
  rainfallLastYear: number;
  rainfallCurrentYear: number;
  attendanceLastYear: number;
  attendanceCurrentYear: number;
}

export interface WeatherApiResponse {
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean?: number[];
  };
}
