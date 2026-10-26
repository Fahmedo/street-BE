// system-health/dto/system-health-response.dto.ts

export type HealthStatus = 'healthy' | 'warning' | 'error';

export class SystemStatusCard {
  label: string;
  value: string | number;
  sublabel: string;
  status: HealthStatus;
}

export class UptimeDataPoint {
  hour: string;
  uptime: number; // percentage 0-100
}

export class SyncDataPoint {
  day: string;
  success: number; // percentage
  failed: number;  // percentage
}

export class ApiResponseDataPoint {
  time: string;
  avg: number; // milliseconds
}

export class ErrorTrendItem {
  category: string;
  count: number;
}

export class DeviceStats {
  total: number;
  online: number;
  offline: number;
  android: number;
  ios: number;
  web: number;
}

export class InfrastructureItem {
  label: string;
  status: HealthStatus;
  detail: string;
}

export class RecentEventItem {
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
  time: string;
  timestamp: Date;
  platform: string;
  action: string;
}

export class PlatformActivityPoint {
  hour: string;
  web: number;
  mobile: number;
  api: number;
}

export class SystemInfoBanner {
  platformVersion: string;
  lastDeploy: string;
  totalRequests24h: number;
  totalErrors24h: number;
  errorRate: string; // e.g. "0.08%"
  dataNote: string;  // e.g. "Device/sync metrics pending integration"
}

export class SystemHealthResponseDto {
  statusCards: SystemStatusCard[];
  uptimeData: UptimeDataPoint[];
  syncData: SyncDataPoint[];         // static fallback
  apiResponseTime: ApiResponseDataPoint[]; // static fallback
  errorTrends: ErrorTrendItem[];
  deviceStats: DeviceStats;          // static fallback
  infrastructure: InfrastructureItem[];
  recentEvents: RecentEventItem[];
  platformActivity: PlatformActivityPoint[];
  systemInfo: SystemInfoBanner;
  metadata: {
    generatedAt: Date;
    timeRangeHours: number;
    dataStartDate: string;
    dataEndDate: string;
    hasRealDeviceData: boolean;
    hasRealSyncData: boolean;
  };
}