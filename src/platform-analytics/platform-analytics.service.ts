// platform-analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { AttendanceStatus } from '../common/enum/attendance.enums';
import { OrganizationStatus } from '../common/enum/organization-status';
import {
  PlatformAnalyticsQueryDto,
  TimeRange,
  GroupBy,
} from './dto/platform-analytics-query.dto';
import {
  PlatformAnalyticsResponseDto,
  KeyInsight,
  TrendDataPoint,
  OrgComparisonData,
  SeasonalPattern,
} from './dto/platform-analytics-response.dto';
import {
  AttendanceRateByMonth,
  DateRange,
  AggregatedMetrics,
} from './interfaces/platform-analytics.interface';

@Injectable()
export class PlatformAnalyticsService {
  private readonly logger = new Logger(PlatformAnalyticsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(SchoolCalendar)
    private readonly calendarRepo: Repository<SchoolCalendar>,
  ) {}

  async getPlatformAnalytics(
    query: PlatformAnalyticsQueryDto,
  ): Promise<PlatformAnalyticsResponseDto> {
    this.logger.log('Fetching platform analytics...');

    const dateRange = this.calculateDateRange(query);
    const previousPeriodRange = this.calculatePreviousPeriod(dateRange);

    const [aggregatedMetrics, attendanceTrends, orgTypeComparison] =
      await Promise.all([
        this.getAggregatedMetrics(dateRange, previousPeriodRange, query),
        this.getAttendanceTrends(dateRange, query.groupBy),
        this.getOrgTypeComparison(dateRange, query),
      ]);

    const keyInsights = this.generateKeyInsights(aggregatedMetrics);
    const seasonalPatterns = this.generateSeasonalPatterns(attendanceTrends);

    return {
      keyInsights,
      attendanceTrends: this.formatAttendanceTrends(attendanceTrends),
      orgTypeComparison,
      seasonalPatterns,
      metadata: {
        totalOrganizations: aggregatedMetrics.totalOrganizations,
        totalSchools: aggregatedMetrics.totalSchools,
        totalStudents: aggregatedMetrics.totalStudents,
        activeSubmissions: aggregatedMetrics.totalAttendanceRecords,
        dataStartDate: dateRange.startDate.toISOString(),
        dataEndDate: dateRange.endDate.toISOString(),
        generatedAt: new Date(),
      },
    };
  }

  // ============================================
  // DATE RANGE CALCULATIONS
  // ============================================

  private calculateDateRange(query: PlatformAnalyticsQueryDto): DateRange {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (query.timeRange === TimeRange.CUSTOM && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.timeRange) {
        case TimeRange.LAST_7_DAYS:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_30_DAYS:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_3_MONTHS:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        case TimeRange.LAST_6_MONTHS:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
          break;
        case TimeRange.LAST_12_MONTHS:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 12);
          break;
        case TimeRange.CURRENT_YEAR:
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
      }
    }

    return { startDate, endDate };
  }

  private calculatePreviousPeriod(currentRange: DateRange): DateRange {
    const diff = currentRange.endDate.getTime() - currentRange.startDate.getTime();
    return {
      startDate: new Date(currentRange.startDate.getTime() - diff),
      endDate: new Date(currentRange.startDate.getTime() - 1),
    };
  }

  // ============================================
  // AGGREGATED METRICS
  // ============================================

  private async getAggregatedMetrics(
    dateRange: DateRange,
    previousRange: DateRange,
    query: PlatformAnalyticsQueryDto,
  ): Promise<AggregatedMetrics> {
    const whereConditions: any = {};
    if (query.organizationType) whereConditions.organizationType = query.organizationType;
    if (query.state) whereConditions.state = query.state;

    const [
      totalOrgs,
      activeOrgs,
      totalSchools,
      activeSchools,
      totalStudents,
      activeStudents,
      currentAttendanceStats,
      previousAttendanceStats,
    ] = await Promise.all([
      this.orgRepo.count({ where: whereConditions }),
      this.orgRepo.count({ where: { ...whereConditions, status: OrganizationStatus.ACTIVE } }),
      this.schoolRepo.count({ where: query.state ? { state: query.state } : {} }),
      this.schoolRepo.count({
        where: query.state ? { state: query.state, isActive: true } : { isActive: true },
      }),
      this.studentRepo.count(),
      this.studentRepo.count({ where: { isActive: true } }),
      this.getAttendanceStats(dateRange),
      this.getAttendanceStats(previousRange),
    ]);

    return {
      totalOrganizations: totalOrgs,
      activeOrganizations: activeOrgs,
      totalSchools,
      activeSchools,
      totalStudents,
      activeStudents,
      totalAttendanceRecords: currentAttendanceStats.totalRecords,
      previousPeriodAttendanceRecords: previousAttendanceStats.totalRecords,
      platformAttendanceRate: currentAttendanceStats.attendanceRate,
      engagementRate: totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0,
      previousPeriodAttendanceRate: previousAttendanceStats.attendanceRate,
    };
  }

  private async getAttendanceStats(
    dateRange: DateRange,
  ): Promise<{ totalRecords: number; attendanceRate: number }> {
    const result = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('COUNT(*)', 'totalRecords')
      .addSelect(
        `ROUND(AVG(CASE WHEN att.status = :present THEN 100 ELSE 0 END)::numeric, 2)`,
        'attendanceRate',
      )
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne();

    return {
      totalRecords: parseInt(result?.totalRecords || '0'),
      attendanceRate: parseFloat(result?.attendanceRate || '0'),
    };
  }

  // ============================================
  // ATTENDANCE TRENDS
  // ============================================

  private async getAttendanceTrends(
    dateRange: DateRange,
    groupBy: GroupBy = GroupBy.MONTH,
  ): Promise<AttendanceRateByMonth[]> {
    const dateFormat = this.getDateFormat(groupBy);

    const results = await this.attendanceRepo
      .createQueryBuilder('att')
      .select(`TO_CHAR(att.attendance_date::date, '${dateFormat}')`, 'month')
      .addSelect('COUNT(*)', 'totalRecords')
      .addSelect(`SUM(CASE WHEN att.status = :present THEN 1 ELSE 0 END)`, 'totalPresent')
      .addSelect(
        `ROUND(AVG(CASE WHEN att.status = :present THEN 100 ELSE 0 END)::numeric, 2)`,
        'attendanceRate',
      )
      .addSelect('COUNT(DISTINCT att.school_id)', 'submissionCount')
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .groupBy(`TO_CHAR(att.attendance_date::date, '${dateFormat}')`)
      .orderBy(`TO_CHAR(att.attendance_date::date, '${dateFormat}')`, 'ASC')
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawMany();

    return results.map((r) => ({
      month: this.formatMonthLabel(r.month, groupBy),
      totalPresent: parseInt(r.totalPresent),
      totalRecords: parseInt(r.totalRecords),
      attendanceRate: parseFloat(r.attendanceRate),
      submissionCount: parseInt(r.submissionCount),
    }));
  }

  // ============================================
  // ORG TYPE COMPARISON
  // ============================================

  private async getOrgTypeComparison(
    dateRange: DateRange,
    query: PlatformAnalyticsQueryDto,
  ): Promise<OrgComparisonData[]> {
    const stateCondition = query.state ? 'org.state = :state' : '1=1';
    const stateParam = query.state ? { state: query.state } : {};

    // Step 1: School counts per org type
    const schoolCounts = await this.schoolRepo
      .createQueryBuilder('school')
      .select('org.organizationType', 'name')
      .addSelect('COUNT(DISTINCT school.school_id)', 'schoolCount')
      .innerJoin(Organization, 'org', 'org.id = school.organization_id')
      .where('org.status = :status', { status: OrganizationStatus.ACTIVE })
      .andWhere(stateCondition, stateParam)
      .groupBy('org.organizationType')
      .getRawMany();

    // Step 2: Student counts per org type
    const studentCounts = await this.studentRepo
      .createQueryBuilder('student')
      .select('org.organizationType', 'name')
      .addSelect('COUNT(DISTINCT student.student_id)', 'studentCount')
      .innerJoin(School, 'school', 'school.school_id = student.school_id')
      .innerJoin(Organization, 'org', 'org.id = school.organization_id')
      .where('org.status = :status', { status: OrganizationStatus.ACTIVE })
      .andWhere(stateCondition, stateParam)
      .groupBy('org.organizationType')
      .getRawMany();

    // Step 3: Attendance rate per org type
    const attendanceStats = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('org.organizationType', 'name')
      .addSelect(
        `ROUND(AVG(CASE WHEN att.status = :present THEN 100 ELSE 0 END)::numeric, 2)`,
        'attendance',
      )
      .innerJoin(School, 'school', 'school.school_id = att.school_id')
      .innerJoin(Organization, 'org', 'org.id = school.organization_id')
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .andWhere('org.status = :status', { status: OrganizationStatus.ACTIVE })
      .andWhere(stateCondition, stateParam)
      .groupBy('org.organizationType')
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawMany();

    // Step 4: Merge by org type
    const studentMap = new Map(studentCounts.map((s) => [s.name, s]));
    const attendanceMap = new Map(attendanceStats.map((a) => [a.name, a]));

    return schoolCounts.map((s) => {
      const student = studentMap.get(s.name);
      const att = attendanceMap.get(s.name);
      return {
        name: this.formatOrgTypeName(s.name ?? ''),
        attendance: parseFloat(att?.attendance ?? '0'),
        schoolCount: parseInt(s.schoolCount ?? '0'),
        studentCount: parseInt(student?.studentCount ?? '0'),
      };
    });
  }

  // ============================================
  // KEY INSIGHTS — all calculated from real data
  // ============================================

  private generateKeyInsights(metrics: AggregatedMetrics): KeyInsight[] {
    const attendanceChange =
      metrics.previousPeriodAttendanceRate > 0
        ? ((metrics.platformAttendanceRate - metrics.previousPeriodAttendanceRate) /
            metrics.previousPeriodAttendanceRate) *
          100
        : 0;

    const submissionChange =
      metrics.previousPeriodAttendanceRecords > 0
        ? ((metrics.totalAttendanceRecords - metrics.previousPeriodAttendanceRecords) /
            metrics.previousPeriodAttendanceRecords) *
          100
        : 0;

    const orgActiveRate =
      metrics.totalOrganizations > 0
        ? (metrics.activeOrganizations / metrics.totalOrganizations) * 100
        : 0;

    return [
      {
        label: 'Platform Attendance',
        value: `${metrics.platformAttendanceRate.toFixed(1)}%`,
        change: `${attendanceChange >= 0 ? '+' : ''}${attendanceChange.toFixed(1)}%`,
        changeType: attendanceChange >= 0 ? 'positive' : 'negative',
        sublabel: 'vs last period',
      },
      {
        label: 'Active Organisations',
        value: metrics.activeOrganizations,
        change: `${orgActiveRate.toFixed(1)}% active`,
        changeType: orgActiveRate >= 50 ? 'positive' : 'negative',
        sublabel: `of ${metrics.totalOrganizations} total`,
      },
      {
        label: 'Total Submissions',
        value: metrics.totalAttendanceRecords.toLocaleString(),
        change: `${submissionChange >= 0 ? '+' : ''}${submissionChange.toFixed(1)}%`,
        changeType: submissionChange >= 0 ? 'positive' : 'negative',
        sublabel: 'vs last period',
      },
      {
        label: 'Engagement Rate',
        value: `${metrics.engagementRate.toFixed(1)}%`,
        change: `${metrics.activeStudents} of ${metrics.totalStudents}`,
        changeType: metrics.engagementRate >= 50 ? 'positive' : 'negative',
        sublabel: 'enrolled students active',
      },
    ];
  }

  // ============================================
  // SEASONAL PATTERNS — derived from real trend data
  // ============================================

  private generateSeasonalPatterns(
    trends: AttendanceRateByMonth[],
  ): SeasonalPattern[] {
    if (trends.length === 0) return [];

    const rates = trends.map((t) => t.attendanceRate);
    const maxAttendance = Math.max(...rates);
    const minAttendance = Math.min(...rates);
    const peakMonth = trends.find((t) => t.attendanceRate === maxAttendance);
    const lowMonth = trends.find((t) => t.attendanceRate === minAttendance);

    const firstMonth = trends[0];
    const lastMonth = trends[trends.length - 1];
    const growth =
      firstMonth.attendanceRate > 0
        ? ((lastMonth.attendanceRate - firstMonth.attendanceRate) /
            firstMonth.attendanceRate) *
          100
        : 0;

    return [
      {
        title: 'Peak Attendance Period',
        value: peakMonth?.month || 'N/A',
        description: `Highest attendance at ${maxAttendance.toFixed(1)}% — best performing period`,
        trend: 'positive',
      },
      {
        title: 'Growth Trajectory',
        value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
        description: 'Period-over-period change in platform-wide attendance',
        trend: growth >= 0 ? 'positive' : 'negative',
      },
      {
        title: 'Lowest Attendance Period',
        value: lowMonth?.month || 'N/A',
        description: `Lowest attendance at ${minAttendance.toFixed(1)}% — may need intervention`,
        trend: 'negative',
      },
    ];
  }

  // ============================================
  // FORMATTERS
  // ============================================

  private formatAttendanceTrends(data: AttendanceRateByMonth[]): TrendDataPoint[] {
    return data.map((d) => ({
      month: d.month,
      rate: Math.round(d.attendanceRate),
      submissions: d.submissionCount,
    }));
  }

  private getDateFormat(groupBy: GroupBy): string {
    switch (groupBy) {
      case GroupBy.DAY:     return 'YYYY-MM-DD';
      case GroupBy.WEEK:    return 'IYYY-IW';
      case GroupBy.MONTH:   return 'YYYY-MM';
      case GroupBy.QUARTER: return 'YYYY-Q';
      default:              return 'YYYY-MM';
    }
  }

  private formatMonthLabel(dateStr: string, groupBy: GroupBy): string {
    if (groupBy === GroupBy.MONTH) {
      const [, month] = dateStr.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return monthNames[parseInt(month) - 1] || dateStr;
    }
    return dateStr;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatOrgTypeName(type: string): string {
    const mapping: Record<string, string> = {
      ngo: 'NGOs',
      government: 'Government',
      private: 'Private',
    };
    return mapping[type?.toLowerCase()] || type;
  }
}