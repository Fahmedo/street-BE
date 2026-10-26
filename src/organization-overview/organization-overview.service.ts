// src/organization-overview/services/organization-overview.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { School } from 'src/school/entities/school.entity';
import { StudentProfile } from 'src/student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { SchoolCalendar } from 'src/school-calendar/entities/school-calendar.entity';
import {
  AttendanceStatus,
  GpsValidationStatus,
} from 'src/common/enum/attendance.enums';
import {
  OrganizationOverviewResponseDto,
  OrganizationOverviewQueryDto,
  DateRangeFilter,
  TrendDataPointDto,
  SchoolComparisonDto,
  AlertDto,
} from './dto/organization-overview.dto';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';
import { In } from 'typeorm';

@Injectable()
export class OrganizationOverviewService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(SchoolCalendar)
    private readonly calendarRepo: Repository<SchoolCalendar>,

    @InjectRepository(OrganizationSchool)
    private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  async getOverview(
    organizationId: string,
    query: OrganizationOverviewQueryDto,
  ): Promise<OrganizationOverviewResponseDto> {
    // Calculate date range
    const { startDate, endDate } = this.calculateDateRange(
      query.range ?? DateRangeFilter.THIS_WEEK,
      query.startDate,
      query.endDate,
    );

    const trendDays = query.trendDays ?? 7;

    const [stats, trendData, schoolComparison, alerts, quickStats] =
      await Promise.all([
        this.getMetricStats(
          organizationId,
          startDate,
          endDate,
          query.range ?? DateRangeFilter.THIS_WEEK,
        ),
        this.getTrendData(organizationId, trendDays),
        this.getSchoolComparison(organizationId, startDate, endDate),
        this.getAlerts(organizationId, startDate, endDate),
        this.getQuickStats(organizationId, startDate, endDate),
      ]);

    return {
      message: 'Organization overview retrieved successfully',
      stats,
      trendData,
      schoolComparison,
      alerts,
      quickStats,
    };
  }

  // ─── ✅ DATE RANGE CALCULATOR ───────────────────────────────────────────
  private calculateDateRange(
    range: DateRangeFilter,
    customStart?: Date,
    customEnd?: Date,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    switch (range) {
      case DateRangeFilter.TODAY:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
        break;

      case DateRangeFilter.THIS_WEEK:
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DateRangeFilter.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;

      case DateRangeFilter.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;

      case DateRangeFilter.LAST_7_DAYS:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DateRangeFilter.LAST_30_DAYS:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DateRangeFilter.LAST_90_DAYS:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DateRangeFilter.CUSTOM:
        if (!customStart || !customEnd) {
          throw new BadRequestException(
            'Custom date range requires startDate and endDate',
          );
        }
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        break;

      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  // ─── ✅ METRIC STATS WITH DATE RANGE ────────────────────────────────────
  private async getMetricStats(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    range: DateRangeFilter,
  ) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Total counts (all time)
    const [totalSchools, totalStudents] = await Promise.all([
      this.schoolRepo.count({ where: { isActive: true } }),
      this.studentRepo.count({ where: { isActive: true } }),
    ]);

    // Schools added in range
    const schoolsInRange = await this.schoolRepo
      .createQueryBuilder('school')
      
.innerJoin('organization_schools', 'os', 'os.school_id = school.school_id')
.where('os.organization_id = :organizationId', { organizationId })
.andWhere('os.is_active = true')
.andWhere('school.is_active = :isActive', { isActive: true })
.andWhere('school.created_at >= :startDate', { startDate })
.andWhere('school.created_at <= :endDate', { endDate })   
      .getCount();

    // Students enrolled in range
    const studentsInRange = await this.studentRepo
      .createQueryBuilder('student')
      .where('student.organization_id = :organizationId', { organizationId })
      .andWhere('student.is_active = :status', { status: true })
      .andWhere('student.created_at >= :startDate', { startDate })
      .andWhere('student.created_at <= :endDate', { endDate })
      .getCount();

    // Attendance rate for date range
    const attendanceInRange = await this.attendanceRepo
      .createQueryBuilder('a')
      .select(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
        'rate',
      )
      .where('a.organization_id = :organizationId', { organizationId })
      .andWhere('a.attendance_date >= :startDate', { startDate: startDateStr })
      .andWhere('a.attendance_date <= :endDate', { endDate: endDateStr })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne<{ rate: string }>();

    const attendanceRate = Number(
      Number(attendanceInRange?.rate ?? 0).toFixed(1),
    );

    // Compare with previous period
    const periodLength = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(startDate.getDate() - periodLength);
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(startDate.getDate() - 1);

    const prevStartDateStr = prevStartDate.toISOString().split('T')[0];
    const prevEndDateStr = prevEndDate.toISOString().split('T')[0];

    const attendancePrevPeriod = await this.attendanceRepo
      .createQueryBuilder('a')
      .select(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
        'rate',
      )
      .where('a.organization_id = :organizationId', { organizationId })
      .andWhere('a.attendance_date >= :startDate', {
        startDate: prevStartDateStr,
      })
      .andWhere('a.attendance_date <= :endDate', { endDate: prevEndDateStr })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne<{ rate: string }>();

    const prevAttendanceRate = Number(
      Number(attendancePrevPeriod?.rate ?? 0).toFixed(1),
    );
    const attendanceChange = Number(
      (attendanceRate - prevAttendanceRate).toFixed(1),
    );

    const avgPerformance = attendanceRate;
    const performanceChange = attendanceChange;

    const rangeLabel = this.getDateRangeLabel(range);

    return {
      totalSchools,
      totalStudents,
      attendanceRate,
      avgPerformance,
      schoolsTrend:
        schoolsInRange > 0 ? `+${schoolsInRange} ${rangeLabel}` : 'No change',
      studentsTrend:
        studentsInRange > 0 ? `+${studentsInRange} ${rangeLabel}` : 'No change',
      attendanceTrend:
        attendanceChange >= 0
          ? `+${attendanceChange}% vs previous period`
          : `${attendanceChange}% vs previous period`,
      performanceTrend:
        performanceChange >= 0
          ? `+${performanceChange}% vs previous period`
          : `${performanceChange}% vs previous period`,
      dateRange: {
        filter: range,
        startDate: startDateStr,
        endDate: endDateStr,
      },
    };
  }

  // ─── HELPER: Get Date Range Label ──────────────────────────────────────
  private getDateRangeLabel(range: DateRangeFilter): string {
    const labels: Record<DateRangeFilter, string> = {
      [DateRangeFilter.TODAY]: 'today',
      [DateRangeFilter.THIS_WEEK]: 'this week',
      [DateRangeFilter.THIS_MONTH]: 'this month',
      [DateRangeFilter.THIS_YEAR]: 'this year',
      [DateRangeFilter.LAST_7_DAYS]: 'last 7 days',
      [DateRangeFilter.LAST_30_DAYS]: 'last 30 days',
      [DateRangeFilter.LAST_90_DAYS]: 'last 90 days',
      [DateRangeFilter.CUSTOM]: 'custom range',
    };
    return labels[range];
  }

  // ─── TREND DATA (unchanged) ─────────────────────────────────────────────
  private async getTrendData(
    organizationId: string,
    days: number,
  ): Promise<TrendDataPointDto[]> {
    const dates: string[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const trendData: TrendDataPointDto[] = [];

    for (const dateStr of dates) {
      const attendanceRaw = await this.attendanceRepo
        .createQueryBuilder('a')
        .select(
          `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
          'rate',
        )
        .where('a.organization_id = :organizationId', { organizationId })
        .andWhere('a.attendance_date = :date', { date: dateStr })
        .setParameter('present', AttendanceStatus.PRESENT)
        .getRawOne<{ rate: string }>();

      const attendance = Number(Number(attendanceRaw?.rate ?? 0).toFixed(0));
      const performance = attendance;

      const date = new Date(dateStr);
      const dayName = dayNames[date.getDay()];

      trendData.push({
        date: dayName,
        attendance,
        performance,
      });
    }

    return trendData;
  }

  // ─── ✅ SCHOOL COMPARISON WITH DATE RANGE ───────────────────────────────
  private async getSchoolComparison(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SchoolComparisonDto[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const schools = await this.schoolRepo.find({
      where: { isActive: true },
      take: 5,
      order: { createdAt: 'DESC' },
    });

    const comparison: SchoolComparisonDto[] = [];

    for (const school of schools) {
      const [studentCount, attendanceRaw] = await Promise.all([
        this.studentRepo.count({
          where: { schoolId: school.schoolId, isActive: true },
        }),
        this.attendanceRepo
          .createQueryBuilder('a')
          .select(
            `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
            'rate',
          )
          .where('a.school_id = :schoolId', { schoolId: school.schoolId })
          .andWhere('a.attendance_date >= :startDate', {
            startDate: startDateStr,
          })
          .andWhere('a.attendance_date <= :endDate', { endDate: endDateStr })
          .setParameter('present', AttendanceStatus.PRESENT)
          .getRawOne<{ rate: string }>(),
      ]);

      const attendance = Number(Number(attendanceRaw?.rate ?? 0).toFixed(0));
      const performance = attendance;

      comparison.push({
        school: school.name,
        schoolId: school.schoolId,
        attendance,
        performance,
        students: studentCount,
      });
    }

    return comparison;
  }

  // ─── ✅ ALERTS WITH DATE RANGE ──────────────────────────────────────────
  private async getAlerts(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AlertDto[]> {
    const orgSchools = await this.orgSchoolRepo.find({
      where: { organizationId, isActive: true },
      select: ['schoolId'],
    });
    const schoolIds = orgSchools.map((os) => os.schoolId);
    const schools = await this.schoolRepo.find({
      where: { schoolId: In(schoolIds), isActive: true },
    });

    const alerts: AlertDto[] = [];
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    for (const school of schools) {
      // Check consecutive absences in range
      const consecutiveAbsences = await this.attendanceRepo
        .createQueryBuilder('a')
        .select('a.student_id', 'studentId')
        .addSelect('COUNT(DISTINCT a.attendance_date)', 'absentDays')
        .where('a.school_id = :schoolId', { schoolId: school.schoolId })
        .andWhere('a.attendance_date >= :from', { from: startDateStr })
        .andWhere('a.attendance_date <= :to', { to: endDateStr })
        .andWhere('a.status = :absent', { absent: AttendanceStatus.ABSENT })
        .groupBy('a.student_id')
        .having('COUNT(DISTINCT a.attendance_date) >= 3')
        .getRawMany();

      const consecutiveCount = consecutiveAbsences.length;

      if (consecutiveCount >= 10) {
        alerts.push({
          id: `${school.schoolId}-absences`,
          severity: 'high',
          school: school.name,
          schoolId: school.schoolId,
          issue: 'Repeated absences',
          details: `${consecutiveCount} students with 3+ absences in selected period`,
          date: endDateStr,
        });
      }

      // Check GPS anomalies in range
      const gpsAnomalies = await this.attendanceRepo
        .createQueryBuilder('a')
        .where('a.school_id = :schoolId', { schoolId: school.schoolId })
        .andWhere('a.attendance_date >= :from', { from: startDateStr })
        .andWhere('a.attendance_date <= :to', { to: endDateStr })
        .andWhere('a.gps_validation_status = :status', {
          status: GpsValidationStatus.OUTSIDE_RADIUS,
        })
        .getCount();

      if (gpsAnomalies >= 10) {
        alerts.push({
          id: `${school.schoolId}-gps`,
          severity: 'high',
          school: school.name,
          schoolId: school.schoolId,
          issue: 'GPS anomaly detected',
          details: `${gpsAnomalies} attendance records outside approved radius`,
          date: endDateStr,
        });
      }
    }

    return alerts
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 4);
  }

  // ─── ✅ QUICK STATS WITH DATE RANGE ─────────────────────────────────────
  private async getQuickStats(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const [atRiskStudents, gpsAnomalies] = await Promise.all([
      this.orgSchoolRepo.count({
        where: {
          //riskLevel: 'red' as any,
          isActive: true,
        },
      }),
      this.attendanceRepo
        .createQueryBuilder('a')
        .where('a.organization_id = :organizationId', { organizationId })
        .andWhere('a.attendance_date >= :startDate', {
          startDate: startDateStr,
        })
        .andWhere('a.attendance_date <= :endDate', { endDate: endDateStr })
        .andWhere('a.gps_validation_status IN (:...statuses)', {
          statuses: [
            GpsValidationStatus.OUTSIDE_RADIUS,
            GpsValidationStatus.INVALID,
            GpsValidationStatus.FAILED,
          ],
        })
        .getCount(),
    ]);

    const weatherAlerts = 0;

    return {
      atRiskStudents,
      gpsAnomalies,
      weatherAlerts,
    };
  }
}
