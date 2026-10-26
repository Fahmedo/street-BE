// system-health/dto/system-health-response.dto.ts

import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Transform } from 'class-transformer';


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
  success: number; // percentage of SYNCED records
  failed: number;  // percentage of CONFLICT records
}

export class ApiResponseDataPoint {
  time: string;
  avg: number; // milliseconds — derived from updated_at - created_at on attendance records
}

export class ErrorTrendItem {
  category: string;
  count: number;
}

export class DeviceStats {
  total: number;
  online: number;   // seen in last 15 minutes
  offline: number;
  android: number;  // from deviceType field if populated, otherwise falls back to mobile mode count
  ios: number;      // from deviceType field if populated, otherwise 0
  web: number;      // MANUAL mode attendance records
}

export class InfrastructureItem {
  label: string;
  status: HealthStatus;
  detail: string;
}

export class RecentEventItem {
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
  time: string;      // human-readable relative time e.g. "2 hours ago"
  timestamp: Date;   // raw timestamp for client-side formatting
  platform: string;  // Web | Mobile | API
  action: string;    // raw AuditAction value
}

export class PlatformActivityPoint {
  hour: string;   // HH:00 for 24h range, Dy for 7d+ range
  web: number;
  mobile: number;
  api: number;
}

export class SystemInfoBanner {
  platformVersion: string;   // from APP_VERSION env var
  lastDeploy: string;        // from LAST_DEPLOY env var
  totalRequests24h: number;  // audit log count in window
  totalErrors24h: number;    // error-classified audit log count
  errorRate: string;         // e.g. "0.08%"
  dataNote: string;          // notes on any data limitations
}

export class SystemHealthMetadata {
  generatedAt: Date;
  timeRangeHours: number;
  dataStartDate: string;
  dataEndDate: string;
  hasRealDeviceData: boolean;   // true — sourced from attendance_records.device_id
  hasRealSyncData: boolean;     // true — sourced from attendance_records.sync_status
  hasDeviceTypeSplit: boolean;  // true only once deviceType field is populated on attendance records
}

export class SystemHealthResponseDto {
  statusCards: SystemStatusCard[];
  uptimeData: UptimeDataPoint[];
  syncData: SyncDataPoint[];
  apiResponseTime: ApiResponseDataPoint[];
  errorTrends: ErrorTrendItem[];
  deviceStats: DeviceStats;
  infrastructure: InfrastructureItem[];
  recentEvents: RecentEventItem[];
  platformActivity: PlatformActivityPoint[];
  systemInfo: SystemInfoBanner;
  metadata: SystemHealthMetadata;
}export enum HealthTimeRange {
  LAST_6_HOURS  = '6h',
  LAST_12_HOURS = '12h',
  LAST_24_HOURS = '24h',
  LAST_7_DAYS   = '7d',
  LAST_30_DAYS  = '30d',
}

export class SystemHealthQueryDto {
  @IsOptional()
  @IsEnum(HealthTimeRange)
  timeRange?: HealthTimeRange = HealthTimeRange.LAST_24_HOURS;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(720) // max 30 days in hours
  hours?: number;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}