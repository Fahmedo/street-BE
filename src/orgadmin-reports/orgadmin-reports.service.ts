import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  In,
} from 'typeorm';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { RewardProgramme } from '../rewardProgramme/entities/reward-programme.entity';
import { RewardIssuance } from '../rewardProgramme/entities/reward-issuance.entity';
import { AttendanceStatus } from '../common/enum/attendance.enums';
import { QueryReportDto } from './dto/query-report.dto';
import {
  AttendanceReportDto,
  RewardsReportDto,
  DemographicsReportDto,
  StudentsReportDto,
  FullReportDto,
} from './dto/report-response.dto';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';


@Injectable()
export class OrgAdminReportsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(RewardProgramme)
    private readonly programmeRepo: Repository<RewardProgramme>,

    @InjectRepository(RewardIssuance)
    private readonly issuanceRepo: Repository<RewardIssuance>,

    @InjectRepository(OrganizationSchool)
    private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDANCE REPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getAttendanceReport(
    organizationId: string,
    query: QueryReportDto,
  ): Promise<AttendanceReportDto> {
    const dateFilter = this.buildDateFilter(query);

    // Summary counts
    const summaryRaw = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)`,
        'presentCount',
      )
      .addSelect(
        `SUM(CASE WHEN a.status = :absent  THEN 1 ELSE 0 END)`,
        'absentCount',
      )
      .addSelect(
        `SUM(CASE WHEN a.status = :late    THEN 1 ELSE 0 END)`,
        'lateCount',
      )
      .where('a.organization_id = :organizationId', { organizationId })
      .andWhere(dateFilter.condition, dateFilter.params)
      .setParameter('present', AttendanceStatus.PRESENT)
      .setParameter('absent', AttendanceStatus.ABSENT)
      .setParameter('late', AttendanceStatus.LATE)
      .getRawOne<{
        total: string;
        presentCount: string;
        absentCount: string;
        lateCount: string;
      }>();

    const total = Number(summaryRaw?.total ?? 0);
    const presentCount = Number(summaryRaw?.presentCount ?? 0);
    const absentCount = Number(summaryRaw?.absentCount ?? 0);
    const lateCount = Number(summaryRaw?.lateCount ?? 0);
    const overallRate =
      total > 0 ? Number(((presentCount / total) * 100).toFixed(1)) : 0;

    // By school
    const bySchoolRaw = await this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoin('a.school', 's')
      .select('a.school_id', 'schoolId')
      .addSelect('s.name', 'schoolName')
      .addSelect('COUNT(*)', 'totalRecords')
      .addSelect(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)`,
        'presentCount',
      )
      .where('a.organization_id = :organizationId', { organizationId })
      .andWhere(dateFilter.condition, dateFilter.params)
      .setParameter('present', AttendanceStatus.PRESENT)
      .groupBy('a.school_id')
      .addGroupBy('s.name')
      .orderBy('"presentCount"', 'DESC')
      .getRawMany<{
        schoolId: string;
        schoolName: string;
        totalRecords: string;
        presentCount: string;
      }>();

    const bySchool = bySchoolRaw.map((r) => {
      const tot = Number(r.totalRecords);
      const pres = Number(r.presentCount);
      return {
        schoolId: r.schoolId,
        schoolName: r.schoolName ?? r.schoolId,
        totalRecords: tot,
        presentCount: pres,
        attendanceRate: tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : 0,
        trend: 0, // Can be enhanced with prev-period comparison
      };
    });

    // By month
    const byMonthRaw = await this.attendanceRepo
      .createQueryBuilder('a')
      .select(`TO_CHAR(a.created_at, 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)', 'totalRecords')
      .addSelect(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)`,
        'presentCount',
      )
      .where('a.organization_id = :organizationId', { organizationId })
      .andWhere(dateFilter.condition, dateFilter.params)
      .setParameter('present', AttendanceStatus.PRESENT)
      .groupBy(`TO_CHAR(a.created_at, 'YYYY-MM')`)
      .orderBy('month', 'ASC')
      .getRawMany<{
        month: string;
        totalRecords: string;
        presentCount: string;
      }>();

    const byMonth = byMonthRaw.map((r) => {
      const tot = Number(r.totalRecords);
      const pres = Number(r.presentCount);
      return {
        month: r.month,
        totalRecords: tot,
        attendanceRate: tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : 0,
      };
    });

    // Lowest performing schools
    const lowestPerforming = [...bySchool]
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 5)
      .map((s) => ({
        schoolId: s.schoolId,
        schoolName: s.schoolName,
        attendanceRate: s.attendanceRate,
        region: '',
      }));

    return {
      summary: {
        totalRecords: total,
        presentCount,
        absentCount,
        lateCount,
        overallRate,
        periodStart: query.startDate ?? '',
        periodEnd: query.endDate ?? '',
      },
      bySchool,
      byMonth,
      lowestPerforming,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REWARDS REPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getRewardsReport(
    organizationId: string,
    query: QueryReportDto,
  ): Promise<RewardsReportDto> {
    const dateFilter = this.buildDateFilter(query);

    const [allProgrammes, allIssuances] = await Promise.all([
      this.programmeRepo.find({ where: { organizationId } }),
      this.issuanceRepo.find({
        where: { organizationId },
        relations: ['programme'],
      }),
    ]);

    const activeProgrammes = allProgrammes.filter((p) => p.status === 'active');
    const approvedIssuances = allIssuances.filter(
      (i) => i.status === 'approved',
    );
    const pendingIssuances = allIssuances.filter((i) => i.status === 'pending');
    const cancelledIssuances = allIssuances.filter(
      (i) => i.status === 'cancelled',
    );

    const completionRate =
      allIssuances.length > 0
        ? Number(
            ((approvedIssuances.length / allIssuances.length) * 100).toFixed(1),
          )
        : 0;

    const issuancesWithChange = allIssuances.filter(
      (i) => i.attendanceChangeSnapshot != null,
    );
    const avgAttendanceImpact =
      issuancesWithChange.length > 0
        ? Number(
            (
              issuancesWithChange.reduce(
                (s, i) => s + (i.attendanceChangeSnapshot ?? 0),
                0,
              ) / issuancesWithChange.length
            ).toFixed(1),
          )
        : 0;

    // By programme
    const byProgramme = await Promise.all(
      allProgrammes.map(async (p) => {
        const issued = allIssuances.filter(
          (i) => i.programmeId === p.programmeId,
        ).length;
        const eligible = await this.issuanceRepo.count({
          where: { programmeId: p.programmeId },
        });
        return {
          programmeId: p.programmeId,
          programmeName: p.name,
          type: p.type,
          issuedCount: issued,
          eligibleCount: eligible,
          rewardType: p.rewardType,
        };
      }),
    );

    // Issuances by month
    const issuancesByMonthRaw = await this.issuanceRepo
      .createQueryBuilder('i')
      .select(`TO_CHAR(i.created_at, 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)', 'issued')
      .where('i.organization_id = :organizationId', { organizationId })
      .groupBy(`TO_CHAR(i.created_at, 'YYYY-MM')`)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; issued: string }>();

    const issuancesByMonth = issuancesByMonthRaw.map((r) => ({
      month: r.month,
      issued: Number(r.issued),
    }));

    // Outcome tracking
    const withOutcome = allIssuances.filter((i) => i.outcomeChange != null);
    const positive = withOutcome.filter(
      (i) => (i.outcomeChange ?? 0) > 0,
    ).length;
    const negative = withOutcome.filter(
      (i) => (i.outcomeChange ?? 0) < 0,
    ).length;
    const avgImprovement =
      withOutcome.length > 0
        ? Number(
            (
              withOutcome.reduce((s, i) => s + (i.outcomeChange ?? 0), 0) /
              withOutcome.length
            ).toFixed(1),
          )
        : 0;

    return {
      summary: {
        totalProgrammes: allProgrammes.length,
        activeProgrammes: activeProgrammes.length,
        totalIssuances: allIssuances.length,
        approvedIssuances: approvedIssuances.length,
        pendingIssuances: pendingIssuances.length,
        cancelledIssuances: cancelledIssuances.length,
        completionRate,
        avgAttendanceImpact,
      },
      byProgramme,
      issuancesByMonth,
      outcomeTracking: {
        withOutcome: withOutcome.length,
        avgImprovement,
        positive,
        negative,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMOGRAPHICS REPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getDemographicsReport(
    organizationId: string,
  ): Promise<DemographicsReportDto> {
    const orgSchools = await this.orgSchoolRepo.find({
      where: { organizationId, isActive: true },
      select: ['schoolId'],
    });
    const schoolIds = orgSchools.map((os) => os.schoolId);

    const [schools, students] = await Promise.all([
      this.schoolRepo.find({
        where: { schoolId: In(schoolIds), isActive: true },
      }),
      this.studentRepo.find({ where: { registeredByOrgId: organizationId } }),
    ]);

    // By region
    const regionMap = new Map<
      string,
      { schoolCount: number; studentCount: number }
    >();
    for (const school of schools) {
      const region = (school as any).region ?? 'Unknown';
      const entry = regionMap.get(region) ?? {
        schoolCount: 0,
        studentCount: 0,
      };
      entry.schoolCount++;
      regionMap.set(region, entry);
    }
    for (const student of students) {
      const school = schools.find(
        (s) => s.schoolId === (student as any).schoolId,
      );
      const region = (school as any)?.region ?? 'Unknown';
      const entry = regionMap.get(region) ?? {
        schoolCount: 0,
        studentCount: 0,
      };
      entry.studentCount++;
      regionMap.set(region, entry);
    }
    const byRegion = Array.from(regionMap.entries()).map(
      ([region, counts]) => ({
        region,
        ...counts,
      }),
    );

    // By gender
    const male = students.filter(
      (s) => s.gender?.toLowerCase() === 'male',
    ).length;
    const female = students.filter(
      (s) => s.gender?.toLowerCase() === 'female',
    ).length;

    // By school type
    const primary = schools.filter(
      (s) => (s as any).schoolType === 'primary',
    ).length;
    const secondary = schools.filter(
      (s) => (s as any).schoolType === 'secondary',
    ).length;
    const nonformal = schools.filter(
      (s) => (s as any).schoolType === 'nonformal',
    ).length;

    // Enrollment trend by month
    const enrollmentRaw = await this.studentRepo
      .createQueryBuilder('s')
      .select(`TO_CHAR(s.created_at, 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)', 'count')
      .where('s.organization_id = :organizationId', { organizationId })
      .groupBy(`TO_CHAR(s.created_at, 'YYYY-MM')`)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; count: string }>();

    return {
      summary: {
        totalSchools: schools.length,
        totalStudents: students.length,
        totalRegions: regionMap.size,
      },
      byRegion,
      byGender: { male, female, other: students.length - male - female },
      bySchoolType: { primary, secondary, nonformal },
      enrollmentTrend: enrollmentRaw.map((r) => ({
        month: r.month,
        count: Number(r.count),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STUDENTS / RISK REPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getStudentsReport(organizationId: string): Promise<StudentsReportDto> {
    const [totalStudents, activeStudents] = await Promise.all([
      this.studentRepo.count({ where: { registeredByOrgId: organizationId } }),
      this.studentRepo.count({
        where: { isActive: true },
      }),
    ]);

    // NOTE: Alert and intervention counts require Alert/Intervention repos
    // Add those via module imports when alert module is wired in
    return {
      summary: {
        totalStudents,
        activeStudents,
        atRiskCount: 0,
        totalAlerts: 0,
        openAlerts: 0,
        resolvedAlerts: 0,
        interventionCount: 0,
      },
      alertsBySeverity: { high: 0, medium: 0, low: 0 },
      schoolsWithMostAlerts: [],
      interventionOutcomes: [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULL COMBINED REPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getFullReport(
    organizationId: string,
    query: QueryReportDto,
  ): Promise<FullReportDto> {
    const [attendance, rewards, demographics, students] = await Promise.all([
      this.getAttendanceReport(organizationId, query),
      this.getRewardsReport(organizationId, query),
      this.getDemographicsReport(organizationId),
      this.getStudentsReport(organizationId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      organization: organizationId,
      attendance,
      rewards,
      demographics,
      students,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private buildDateFilter(query: QueryReportDto): {
    condition: string;
    params: Record<string, any>;
  } {
    if (query.startDate && query.endDate) {
      return {
        condition: 'a.created_at BETWEEN :startDate AND :endDate',
        params: {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        },
      };
    }
    if (query.startDate) {
      return {
        condition: 'a.created_at >= :startDate',
        params: { startDate: new Date(query.startDate) },
      };
    }
    if (query.endDate) {
      return {
        condition: 'a.created_at <= :endDate',
        params: { endDate: new Date(query.endDate) },
      };
    }
    // Default: last 90 days
    const d90 = new Date();
    d90.setDate(d90.getDate() - 90);
    return {
      condition: 'a.created_at >= :startDate',
      params: { startDate: d90 },
    };
  }
}
