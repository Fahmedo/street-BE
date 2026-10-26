// platform-reports/platform-reports.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { Intervention } from '../intervention/entities/intervention.entity';
import { MentorAssignment } from '../mentor/entities/mentor-assignment.entity';
import { RewardProgramme } from '../rewardProgramme/entities/reward-programme.entity';
import { RewardIssuance } from '../rewardProgramme/entities/reward-issuance.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AttendanceStatus } from '../common/enum/attendance.enums';
import { OrganizationStatus } from '../common/enum/organization-status';
import { InterventionStatus } from '../common/enum/intervention.enum';
import { Role } from '../common/enum/roles.enum';
import {
  PlatformReportsQueryDto,
  ReportTimeRange,
} from './dto/platform-reports-query.dto';
import {
  PlatformReportsResponseDto,
  AttendanceReportSummary,
  OrganisationReportSummary,
  StudentReportSummary,
  MentorReportSummary,
  InterventionReportSummary,
  RewardReportSummary,
  AuditReportSummary,
  SchoolAdminReportSummary,
  UsersReportSummary,
} from './dto/platform-reports-response.dto';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Reusable expression — avoids repeating the long CASE string
const ATTENDANCE_RATE_EXPR = `ROUND(AVG(CASE WHEN att.status IN ('PRESENT','LATE') THEN 100.0 ELSE 0 END)::numeric, 1)`;

@Injectable()
export class PlatformReportsService {
  private readonly logger = new Logger(PlatformReportsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(OrganizationUser)
    private readonly orgUserRepo: Repository<OrganizationUser>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(Intervention)
    private readonly interventionRepo: Repository<Intervention>,

    @InjectRepository(MentorAssignment)
    private readonly mentorAssignmentRepo: Repository<MentorAssignment>,

    @InjectRepository(RewardProgramme)
    private readonly rewardProgrammeRepo: Repository<RewardProgramme>,

    @InjectRepository(RewardIssuance)
    private readonly rewardIssuanceRepo: Repository<RewardIssuance>,

    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async getAllReports(
    query: PlatformReportsQueryDto,
  ): Promise<PlatformReportsResponseDto> {
    this.logger.log('Generating platform-wide reports...');

    const dateRange = this.resolveDateRange(query);

    const [
      attendance,
      organisations,
      students,
      users,
      mentors,
      schoolAdmins,
      interventions,
      rewards,
      audit,
    ] = await Promise.all([
      this.getAttendanceReport(dateRange, query),
      this.getOrganisationReport(dateRange, query),
      this.getStudentReport(dateRange, query),
      this.getUsersReport(dateRange, query), 
      this.getMentorReport(dateRange, query),
      this.getSchoolAdminReport(dateRange, query),
      this.getInterventionReport(dateRange, query),
      this.getRewardReport(dateRange, query),
      this.getAuditReport(dateRange, query),
    ]);

    return {
      attendance,
      organisations,
      students,
       users,
      mentors,
      schoolAdmins,
      interventions,
      rewards,
      audit,
      metadata: {
        generatedAt:   new Date(),
        timeRange:     query.timeRange ?? ReportTimeRange.LAST_30_DAYS,
        dataStartDate: dateRange.startDate.toISOString(),
        dataEndDate:   dateRange.endDate.toISOString(),
        appliedFilters: {
          state:          query.state,
          organizationId: query.organizationId,
          academicYear:   query.academicYear,
        },
      },
    };
  }

  // ============================================================
  // DATE RANGE
  // ============================================================

  private resolveDateRange(query: PlatformReportsQueryDto): DateRange {
    const endDate   = new Date();
    let startDate: Date;

    switch (query.timeRange) {
      case ReportTimeRange.LAST_7_DAYS:
        startDate = new Date(endDate.getTime() - 7 * 864e5);
        break;
      case ReportTimeRange.LAST_3_MONTHS:
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case ReportTimeRange.LAST_6_MONTHS:
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case ReportTimeRange.LAST_12_MONTHS:
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 12);
        break;
      case ReportTimeRange.CURRENT_YEAR:
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case ReportTimeRange.LAST_30_DAYS:
      default:
        startDate = new Date(endDate.getTime() - 30 * 864e5);
    }

    return { startDate, endDate };
  }

  private fmt(date: Date): string {
    return date.toISOString().split('T')[0];
  }


  // ============================================================
  // 1. ATTENDANCE REPORT
  // ============================================================

  private async getAttendanceReport(
    dateRange: DateRange,
    query: PlatformReportsQueryDto,
  ): Promise<AttendanceReportSummary> {
    // ── Overall counts ──────────────────────────────────────────
    const overallQb = this.attendanceRepo
      .createQueryBuilder('att')
      .select('att.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('att.attendance_date BETWEEN :start AND :end', {
        start: this.fmt(dateRange.startDate),
        end:   this.fmt(dateRange.endDate),
      })
      .groupBy('att.status');

    if (query.organizationId)
      overallQb.andWhere('att.organization_id = :orgId', { orgId: query.organizationId });
    if (query.state)
      overallQb.andWhere('(SELECT state FROM schools WHERE school_id = att.school_id) = :state', { state: query.state });

    const statusRows = await overallQb.getRawMany();

    const countMap: Record<string, number> = {};
    statusRows.forEach((r) => (countMap[r.status] = parseInt(r.count, 10)));

    const presentCount  = countMap[AttendanceStatus.PRESENT]  ?? 0;
    const absentCount   = countMap[AttendanceStatus.ABSENT]   ?? 0;
    const lateCount     = countMap[AttendanceStatus.LATE]     ?? 0;
    const excusedCount  = countMap[AttendanceStatus.EXCUSED]  ?? 0;
    const totalRecords  = presentCount + absentCount + lateCount + excusedCount;
    const overallRate   = totalRecords > 0
      ? ((presentCount + lateCount) / totalRecords) * 100
      : 0;

    // ── Daily trend ─────────────────────────────────────────────
    const trendRows = await this.attendanceRepo
      .createQueryBuilder('att')
      .select(`to_char(att.attendance_date::date, 'YYYY-MM-DD')`, 'period')
      .addSelect(ATTENDANCE_RATE_EXPR, 'rate')
      .where('att.attendance_date BETWEEN :start AND :end', {
        start: this.fmt(dateRange.startDate),
        end:   this.fmt(dateRange.endDate),
      })
      .groupBy('period')
      .orderBy('period', 'ASC')   // safe — ordering by a non-aggregate string column alias
      .getRawMany();

    // ── Per-org attendance ──────────────────────────────────────
    // FIX: repeat the full expression in orderBy — PostgreSQL rejects alias refs here
    const orgAttRows = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('att.organization_id', 'organizationId')
      .addSelect('org.organizationName', 'organizationName')
      .addSelect('COUNT(*)', 'totalRecords')
      .addSelect(ATTENDANCE_RATE_EXPR, 'rate')
      .innerJoin(Organization, 'org', 'org.id = att.organization_id')
      .where('att.attendance_date BETWEEN :start AND :end', {
        start: this.fmt(dateRange.startDate),
        end:   this.fmt(dateRange.endDate),
      })
      .groupBy('att.organization_id, org.organizationName')
      .orderBy(ATTENDANCE_RATE_EXPR, 'ASC')  // ✅ repeat expression, not alias
      .getRawMany();

    // ── Lowest 5 schools ────────────────────────────────────────
    // FIX: same — repeat expression in orderBy
    const lowestSchoolRows = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('att.school_id', 'schoolId')
      .addSelect('school.name', 'schoolName')
      .addSelect('org.organizationName', 'organizationName')
      .addSelect('COUNT(DISTINCT att.student_id)', 'totalStudents')
      .addSelect(ATTENDANCE_RATE_EXPR, 'rate')
      .innerJoin(School, 'school', 'school.school_id = att.school_id')
      .innerJoin(Organization, 'org', 'org.id = att.organization_id')
      .where('att.attendance_date BETWEEN :start AND :end', {
        start: this.fmt(dateRange.startDate),
        end:   this.fmt(dateRange.endDate),
      })
      .groupBy('att.school_id, school.name, org.organizationName')
      .orderBy(ATTENDANCE_RATE_EXPR, 'ASC')  // ✅ repeat expression, not alias
      .limit(5)
      .getRawMany();

    return {
      overallRate:   parseFloat(overallRate.toFixed(1)),
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      trend: trendRows.map((r) => ({ period: r.period, rate: parseFloat(r.rate) })),
      byOrganisation: orgAttRows.map((r) => ({
        organizationId:   r.organizationId,
        organizationName: r.organizationName,
        rate:             parseFloat(r.rate),
        totalRecords:     parseInt(r.totalRecords, 10),
      })),
      lowestSchools: lowestSchoolRows.map((r) => ({
        schoolId:         r.schoolId,
        schoolName:       r.schoolName,
        organizationName: r.organizationName,
        rate:             parseFloat(r.rate),
        totalStudents:    parseInt(r.totalStudents, 10),
      })),
    };
  }

  // ============================================================
  // 2. ORGANISATION REPORT
  // ============================================================

  private async getOrganisationReport(
    dateRange: DateRange,
    query: PlatformReportsQueryDto,
  ): Promise<OrganisationReportSummary> {
    const baseQb = () => {
      const qb = this.orgRepo.createQueryBuilder('org');
      if (query.state) qb.where('org.state = :state', { state: query.state });
      return qb;
    };

    const [total, active, inactive, pending, newThisPeriod, byStateRows, topRows] =
      await Promise.all([
        baseQb().getCount(),

        baseQb()
          .andWhere('org.status = :s', { s: OrganizationStatus.ACTIVE })
          .getCount(),

        baseQb()
          .andWhere('org.status = :s', { s: OrganizationStatus.SUSPENDED })
          .getCount(),

        baseQb()
          .andWhere('org.status = :s', { s: OrganizationStatus.PENDING })
          .getCount(),

        baseQb()
          .andWhere('org.createdAt BETWEEN :start AND :end', {
            start: dateRange.startDate,
            end:   dateRange.endDate,
          })
          .getCount(),

        // by state — query directly (not through baseQb) so a state filter on the
        // request doesn't collapse all results to one row.
        // Use the raw SQL column name in SELECT to avoid TypeORM aliasing it as
        // "org_state" in getRawMany() results.
        this.orgRepo
          .createQueryBuilder('org')
          .select(`org.state`, 'state')
          .addSelect('COUNT(*)', 'count')
          .where('org.state IS NOT NULL')
          .groupBy('org.state')
          .orderBy('COUNT(*)', 'DESC')
          .getRawMany(),

        // top performing orgs
        // FIX: orderBy repeats the full AVG expression — alias 'attendanceRate' is
        //      not referenceable in ORDER BY in the same SELECT scope in PostgreSQL
        this.attendanceRepo
          .createQueryBuilder('att')
          .select('att.organization_id', 'organizationId')
          .addSelect('org.organizationName', 'organizationName')
          .addSelect(ATTENDANCE_RATE_EXPR, 'attendanceRate')
          .addSelect('COUNT(DISTINCT att.student_id)', 'totalStudents')
          .addSelect('COUNT(DISTINCT att.school_id)', 'totalSchools')
          .innerJoin(Organization, 'org', 'org.id = att.organization_id')
          .where('att.attendance_date BETWEEN :start AND :end', {
            start: this.fmt(dateRange.startDate),
            end:   this.fmt(dateRange.endDate),
          })
          .groupBy('att.organization_id, org.organizationName')
          .orderBy(ATTENDANCE_RATE_EXPR, 'DESC')  // ✅ repeat expression, not alias
          .limit(10)
          .getRawMany(),
      ]);

    // mentor counts per org
    const mentorCountRows = await this.orgUserRepo
      .createQueryBuilder('u')
      .select('u.organizationId', 'organizationId')
      .addSelect('COUNT(*)', 'mentorCount')
      .where(`u.roles LIKE :mentorRole`, { mentorRole: `%${Role.MENTOR}%` })
      .andWhere('u.status = :active', { active: OrganizationStatus.ACTIVE })
      .groupBy('u.organizationId')
      .getRawMany();

    const mentorMap = new Map(
      mentorCountRows.map((r) => [r.organizationId, parseInt(r.mentorCount, 10)]),
    );



    return {
      total,
      active,
      inactive,
      pending,
      newThisPeriod,
      byState: byStateRows.map((r) => ({
        state: r.state ?? 'Unknown',
        count: parseInt(r.count, 10),
      })),
      topPerforming: topRows.map((r) => ({
        organizationId:   r.organizationId,
        organizationName: r.organizationName,
        attendanceRate:   parseFloat(r.attendanceRate),
        totalStudents:    parseInt(r.totalStudents, 10),
        totalSchools:     parseInt(r.totalSchools, 10),
        totalMentors:     mentorMap.get(r.organizationId) ?? 0,
      })),
    };
  }

  // ============================================================
  // 3. STUDENT REPORT
  // ============================================================

  private async getStudentReport(
    dateRange: DateRange,
    query: PlatformReportsQueryDto,
  ): Promise<StudentReportSummary> {
    const baseQb = () => {
      const qb = this.studentRepo.createQueryBuilder('s');
      if (query.organizationId)
        qb.where('s.organization_id = :orgId', { orgId: query.organizationId });
      if (query.state)
        qb.leftJoin('s.school', 'school').andWhere('school.state = :state', { state: query.state });
      return qb;
    };

    const [
      total,
      active,
      inactive,
      newEnrollments,
      riskRows,
      perfRows,
      genderRows,
      atRiskRows,
    ] = await Promise.all([
      baseQb().getCount(),

      baseQb().andWhere('s.is_active = true').getCount(),

      baseQb().andWhere('s.is_active = false').getCount(),

      baseQb()
        .andWhere('s.created_at BETWEEN :start AND :end', {
          start: dateRange.startDate,
          end:   dateRange.endDate,
        })
        .getCount(),

      baseQb()
        .select('s.risk_level', 'level')
        .addSelect('COUNT(*)', 'count')
        .groupBy('s.risk_level')
        .getRawMany(),

      baseQb()
        .select('s.performance_status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('s.performance_status')
        .getRawMany(),

      baseQb()
        .select('s.gender', 'gender')
        .addSelect('COUNT(*)', 'count')
        .where('s.gender IS NOT NULL')
        .groupBy('s.gender')
        .getRawMany(),

      // At-risk students (red)
      this.studentRepo
        .createQueryBuilder('s')
        .select([
          's.studentId', 's.firstName', 's.lastName',
          's.riskLevel', 's.performanceStatus',
        ])
        .leftJoin('s.school', 'school')
        .leftJoin('school.organization', 'org')
        .addSelect('school.name', 'schoolName')
        .addSelect('org.organizationName', 'orgName')
        .where('s.risk_level = :risk', { risk: 'red' })
        .andWhere('s.is_active = true')
        .limit(20)
        .getRawMany(),
    ]);

    const totalForPct = total || 1;

    return {
      total,
      active,
      inactive,
      newEnrollments,
      byRiskLevel: riskRows.map((r) => ({
        level:      r.level,
        count:      parseInt(r.count, 10),
        percentage: parseFloat(((parseInt(r.count, 10) / totalForPct) * 100).toFixed(1)),
      })),
      byPerformanceStatus: perfRows.map((r) => ({
        status:     r.status,
        count:      parseInt(r.count, 10),
        percentage: parseFloat(((parseInt(r.count, 10) / totalForPct) * 100).toFixed(1)),
      })),
      byGender: genderRows.map((r) => ({
        gender:     r.gender,
        count:      parseInt(r.count, 10),
        percentage: parseFloat(((parseInt(r.count, 10) / totalForPct) * 100).toFixed(1)),
      })),
      atRisk: atRiskRows.map((r) => ({
        studentId:         r.s_student_id,
        name:              `${r.s_first_name} ${r.s_last_name}`,
        schoolName:        r.schoolName,
        organizationName:  r.orgName,
        riskLevel:         r.s_risk_level,
        performanceStatus: r.s_performance_status,
      })),
    };
  }

  // ============================================================
  // 4. MENTOR / USERS REPORT
  // ============================================================

  // ============================================================
// 4. USERS REPORT (ALL ROLES COMBINED)
// ============================================================

private async getUsersReport(
  dateRange: DateRange,
  query: PlatformReportsQueryDto,
): Promise<UsersReportSummary> {
  const baseQb = () => {
    const qb = this.orgUserRepo.createQueryBuilder('u');
    if (query.organizationId)
      qb.where('u.organizationId = :orgId', { orgId: query.organizationId });
    return qb;
  };

  const [
    totalUsers,
    activeUsers,
    newUsers,
    statusRows,
    orgBreakdownRows,
  ] = await Promise.all([
    baseQb().getCount(),

    baseQb()
      .andWhere('u.lastLogin > :threshold', { threshold: dateRange.startDate })
      .getCount(),

    baseQb()
      .andWhere('u.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end:   dateRange.endDate,
      })
      .getCount(),

    // by status
    baseQb()
      .select('u.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.status')
      .getRawMany(),

    // per org breakdown with role counts
    this.orgUserRepo
      .createQueryBuilder('u')
      .select('u.organizationId', 'organizationId')
      .addSelect('org.organizationName', 'organizationName')
      .addSelect('COUNT(*)', 'totalUsers')
      .addSelect(
        `SUM(CASE WHEN u.lastLogin > :activeThreshold THEN 1 ELSE 0 END)`,
        'activeUsers',
      )
      .addSelect(
        `SUM(CASE WHEN u.roles LIKE :mentorRole THEN 1 ELSE 0 END)`,
        'mentors',
      )
      .addSelect(
        `SUM(CASE WHEN u.roles LIKE :schoolAdminRole THEN 1 ELSE 0 END)`,
        'schoolAdmins',
      )
      .addSelect(
        `SUM(CASE WHEN u.roles LIKE :orgAdminRole THEN 1 ELSE 0 END)`,
        'orgAdmins',
      )
      .innerJoin(Organization, 'org', 'org.id = u.organizationId')
      .groupBy('u.organizationId, org.organizationName')
      .setParameter('activeThreshold', dateRange.startDate)
      .setParameter('mentorRole', `%${Role.MENTOR}%`)
      .setParameter('schoolAdminRole', `%${Role.SCHOOL_ADMIN}%`)
      .setParameter('orgAdminRole', `%${Role.ORGANIZATION_ADMIN}%`)
      .getRawMany(),
  ]);

  // ✅ FIXED: Use positional parameters with .query()
  const roleCountQuery = `
    SELECT 
      CASE 
        WHEN roles LIKE $1 THEN '${Role.MENTOR}'
        WHEN roles LIKE $2 THEN '${Role.SCHOOL_ADMIN}'
        WHEN roles LIKE $3 THEN '${Role.ORGANIZATION_ADMIN}'
        ELSE 'OTHER'
      END as role,
      COUNT(*) as count,
      SUM(CASE WHEN "lastLogin" > $4 THEN 1 ELSE 0 END) as active_count
    FROM organization_users
    ${query.organizationId ? 'WHERE "organizationId" = $5' : ''}
    GROUP BY role
  `;

  const params = [
    `%${Role.MENTOR}%`,
    `%${Role.SCHOOL_ADMIN}%`,
    `%${Role.ORGANIZATION_ADMIN}%`,
    dateRange.startDate,
  ];
  
  if (query.organizationId) {
    params.push(query.organizationId);
  }

  const roleRows = await this.orgUserRepo.query(roleCountQuery, params);

  const totalForPct = totalUsers || 1;
  const inactiveUsers = totalUsers - activeUsers;

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    newUsersThisPeriod: newUsers,
    byRole: roleRows.map((r) => ({
      role:        r.role,
      count:       parseInt(r.count, 10),
      activeCount: parseInt(r.active_count, 10),
      percentage:  parseFloat(((parseInt(r.count, 10) / totalForPct) * 100).toFixed(1)),
    })),
    byOrganisation: orgBreakdownRows.map((r) => ({
      organizationId:   r.organizationId,
      organizationName: r.organizationName,
      totalUsers:       parseInt(r.totalUsers, 10),
      activeUsers:      parseInt(r.activeUsers, 10),
      mentors:          parseInt(r.mentors, 10),
      schoolAdmins:     parseInt(r.schoolAdmins, 10),
      orgAdmins:        parseInt(r.orgAdmins, 10),
      otherRoles:       parseInt(r.totalUsers, 10) - 
                        parseInt(r.mentors, 10) - 
                        parseInt(r.schoolAdmins, 10) - 
                        parseInt(r.orgAdmins, 10),
    })),
    byStatus: statusRows.map((r) => ({
      status:     r.status,
      count:      parseInt(r.count, 10),
      percentage: parseFloat(((parseInt(r.count, 10) / totalForPct) * 100).toFixed(1)),
    })),
  };
}
private async getMentorReport(
  dateRange: DateRange,
  query: PlatformReportsQueryDto,
): Promise<MentorReportSummary> {
  const MENTOR_FILTER    = `u.roles LIKE :mentorRole`;
  const ORG_ADMIN_FILTER = `u.roles LIKE :orgAdminRole`;
  const mentorLike       = `%${Role.MENTOR}%`;
  const orgAdminLike     = `%${Role.ORGANIZATION_ADMIN}%`;

  const mentorBaseQb = () => {
    const qb = this.orgUserRepo
      .createQueryBuilder('u')
      .where(MENTOR_FILTER, { mentorRole: mentorLike });
    if (query.organizationId)
      qb.andWhere('u.organizationId = :orgId', { orgId: query.organizationId });
    return qb;
  };

  const [
    totalMentors,
    newMentors,
    totalAdminUsers,
    orgBreakdownRows,
    inactiveRows,
  ] = await Promise.all([
    mentorBaseQb().getCount(),

    mentorBaseQb()
      .andWhere('u.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end:   dateRange.endDate,
      })
      .getCount(),

    this.orgUserRepo
      .createQueryBuilder('u')
      .where(ORG_ADMIN_FILTER, { orgAdminRole: orgAdminLike })
      .getCount(),

    // mentors per org with active count
    this.orgUserRepo
      .createQueryBuilder('u')
      .select('u.organizationId', 'organizationId')
      .addSelect('org.organizationName', 'organizationName')
      .addSelect('COUNT(*)', 'mentorCount')
      .addSelect(
        `SUM(CASE WHEN u.lastLogin > :activeThreshold THEN 1 ELSE 0 END)`,
        'activeCount',
      )
      .innerJoin(Organization, 'org', 'org.id = u.organizationId')
      .where(MENTOR_FILTER, { mentorRole: mentorLike })
      .groupBy('u.organizationId, org.organizationName')
      .setParameter('activeThreshold', dateRange.startDate)
      .getRawMany(),

    // inactive mentors — no login in period
    this.orgUserRepo
      .createQueryBuilder('u')
      .select([
        'u.id', 'u.firstName', 'u.lastName',
        'u.email', 'u.organizationId', 'u.lastLogin',
      ])
      .addSelect('org.organizationName', 'orgName')
      .innerJoin(Organization, 'org', 'org.id = u.organizationId')
      .where(MENTOR_FILTER, { mentorRole: mentorLike })
      .andWhere(
        '(u.lastLogin IS NULL OR u.lastLogin < :threshold)',
        { threshold: dateRange.startDate },
      )
      .orderBy('u.lastLogin', 'ASC', 'NULLS FIRST')
      .limit(15)
      .getRawMany(),
  ]);

  // ✅ FIXED: Count unique mentors from ALL active assignments
  const assignmentCountRow = await this.mentorAssignmentRepo
    .createQueryBuilder('ma')
    .select('COUNT(DISTINCT ma.mentor_id)', 'totalMentors')
    .where('ma.is_active = true')
    .getRawOne();

  const totalActiveMentors = parseInt(assignmentCountRow?.totalMentors ?? '1', 10);

  // ✅ FIXED: Count students using correct column name (student_id, not id)
  const studentCountQuery = `
    SELECT COUNT(DISTINCT sp.student_id) as total_students
    FROM mentor_assignments ma
    LEFT JOIN students sp ON (
      (ma.scope = 'student' AND ma.student_id = sp.student_id)
      OR (ma.scope = 'class' AND ma.class_id = sp.class_id)
      OR (ma.scope = 'school' AND ma.school_id = sp.school_id)
    )
    WHERE ma.is_active = true
      AND sp.student_id IS NOT NULL
  `;
  
  const studentCountResult = await this.mentorAssignmentRepo.query(studentCountQuery);
  const totalAssignedStudents = parseInt(studentCountResult[0]?.total_students ?? '0', 10);
  
  const avgStudentsPerMentor = totalActiveMentors > 0 
    ? parseFloat((totalAssignedStudents / totalActiveMentors).toFixed(1))
    : 0;

  const activeMentors   = orgBreakdownRows.reduce((s, r) => s + parseInt(r.activeCount, 10), 0);
  const inactiveMentors = totalMentors - activeMentors;

  // ✅ FIXED: students per org using correct column name
  const studentsByOrgQuery = `
    SELECT 
      ma.organization_id as "organizationId",
      COUNT(DISTINCT sp.student_id) as total_students
    FROM mentor_assignments ma
    LEFT JOIN students sp ON (
      (ma.scope = 'student' AND ma.student_id = sp.student_id)
      OR (ma.scope = 'class' AND ma.class_id = sp.class_id)
      OR (ma.scope = 'school' AND ma.school_id = sp.school_id)
    )
    WHERE ma.is_active = true
      AND sp.student_id IS NOT NULL
    GROUP BY ma.organization_id
  `;

  const studentsByOrgRows = await this.mentorAssignmentRepo.query(studentsByOrgQuery);

const studentsMap = new Map<string, number>();
for (const row of studentsByOrgRows) {
  studentsMap.set(row.organizationId, parseInt(row.total_students, 10));
}

  return {
    totalMentors,
    activeMentors,
    inactiveMentors,
    totalAdminUsers,
    newMentorsThisPeriod: newMentors,
    avgStudentsPerMentor,
    byOrganisation: orgBreakdownRows.map((r) => ({
      organizationId:        r.organizationId,
      organizationName:      r.organizationName,
      mentorCount:           parseInt(r.mentorCount, 10),
      activeCount:           parseInt(r.activeCount, 10),
       totalStudentsAssigned: studentsMap.get(r.organizationId) ?? 0,
    })),
    inactive: inactiveRows.map((r) => ({
      userId:           r.u_id,
      name:             `${r.u_firstName} ${r.u_lastName}`,
      email:            r.u_email,
      organizationName: r.orgName,
      lastLogin:        r.u_lastLogin,
      assignedStudents: 0, // Would need per-mentor calculation
    })),
  };
}

// ============================================================
// 4B. SCHOOL ADMIN REPORT
// ============================================================

private async getSchoolAdminReport(
  dateRange: DateRange,
  query: PlatformReportsQueryDto,
): Promise<SchoolAdminReportSummary> {
  const SCHOOL_ADMIN_FILTER = `u.roles LIKE :schoolAdminRole`;
  const schoolAdminLike = `%${Role.SCHOOL_ADMIN}%`;

  const schoolAdminBaseQb = () => {
    const qb = this.orgUserRepo
      .createQueryBuilder('u')
      .where(SCHOOL_ADMIN_FILTER, { schoolAdminRole: schoolAdminLike });
    if (query.organizationId)
      qb.andWhere('u.organizationId = :orgId', { orgId: query.organizationId });
    return qb;
  };

  const [
    totalSchoolAdmins,
    newSchoolAdmins,
    orgBreakdownRows,
    inactiveRows,
  ] = await Promise.all([
    schoolAdminBaseQb().getCount(),

    schoolAdminBaseQb()
      .andWhere('u.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end:   dateRange.endDate,
      })
      .getCount(),

    // school admins per org with active count
    this.orgUserRepo
      .createQueryBuilder('u')
      .select('u.organizationId', 'organizationId')
      .addSelect('org.organizationName', 'organizationName')
      .addSelect('COUNT(*)', 'schoolAdminCount')
      .addSelect(
        `SUM(CASE WHEN u.lastLogin > :activeThreshold THEN 1 ELSE 0 END)`,
        'activeCount',
      )
      .innerJoin(Organization, 'org', 'org.id = u.organizationId')
      .where(SCHOOL_ADMIN_FILTER, { schoolAdminRole: schoolAdminLike })
      .groupBy('u.organizationId, org.organizationName')
      .setParameter('activeThreshold', dateRange.startDate)
      .getRawMany(),

    // inactive school admins — no login in period
    this.orgUserRepo
      .createQueryBuilder('u')
      .select([
        'u.id', 'u.firstName', 'u.lastName',
        'u.email', 'u.organizationId', 'u.lastLogin',
      ])
      .addSelect('org.organizationName', 'orgName')
      .innerJoin(Organization, 'org', 'org.id = u.organizationId')
      .where(SCHOOL_ADMIN_FILTER, { schoolAdminRole: schoolAdminLike })
      .andWhere(
        '(u.lastLogin IS NULL OR u.lastLogin < :threshold)',
        { threshold: dateRange.startDate },
      )
      .orderBy('u.lastLogin', 'ASC', 'NULLS FIRST')
      .limit(15)
      .getRawMany(),
  ]);

  // Count schools assigned to school admins
 const schoolCountQuery = `
  SELECT 
    u.id as user_id,
    u."organizationId" as organization_id,
    COUNT(DISTINCT ous."schoolId") as total_schools
  FROM organization_users u
  LEFT JOIN organization_user_schools ous ON ous."userId" = u.id
  WHERE u.roles LIKE $1
  GROUP BY u.id, u."organizationId"
`;

const schoolCountRows = await this.orgUserRepo.query(schoolCountQuery, [schoolAdminLike]);

  // Map of userId -> school count
const userSchoolMap = new Map<string, number>();
let totalSchoolsAssigned = 0;
for (const row of schoolCountRows) {
  const count = parseInt(row.total_schools, 10);
  userSchoolMap.set(row.user_id, count);
  totalSchoolsAssigned += count;
}
  // Map of organizationId -> total schools
const orgSchoolsQuery = `
  SELECT 
    u."organizationId" as organization_id,
    COUNT(DISTINCT ous."schoolId") as total_schools
  FROM organization_users u
  LEFT JOIN organization_user_schools ous ON ous."userId" = u.id
  WHERE u.roles LIKE $1
  GROUP BY u."organizationId"
`;

const orgSchoolRows = await this.orgUserRepo.query(orgSchoolsQuery, [schoolAdminLike]);
  const orgSchoolsMap = new Map<string, number>();
  for (const row of orgSchoolRows) {
    orgSchoolsMap.set(row.organization_id, parseInt(row.total_schools, 10));
  }

  const avgSchoolsPerAdmin = totalSchoolAdmins > 0
    ? parseFloat((totalSchoolsAssigned / totalSchoolAdmins).toFixed(1))
    : 0;

  const activeMentors = orgBreakdownRows.reduce((s, r) => s + parseInt(r.activeCount, 10), 0);
  const inactiveSchoolAdmins = totalSchoolAdmins - activeMentors;

  return {
    totalSchoolAdmins,
    activeSchoolAdmins: activeMentors,
    inactiveSchoolAdmins,
    newSchoolAdminsThisPeriod: newSchoolAdmins,
    avgSchoolsPerAdmin,
    byOrganisation: orgBreakdownRows.map((r) => ({
      organizationId:        r.organizationId,
      organizationName:      r.organizationName,
      schoolAdminCount:      parseInt(r.schoolAdminCount, 10),
      activeCount:           parseInt(r.activeCount, 10),
      totalSchoolsAssigned:  orgSchoolsMap.get(r.organizationId) ?? 0,
    })),
    inactive: inactiveRows.map((r) => ({
      userId:           r.u_id,
      name:             `${r.u_firstName} ${r.u_lastName}`,
      email:            r.u_email,
      organizationName: r.orgName,
      lastLogin:        r.u_lastLogin,
      assignedSchools:  userSchoolMap.get(r.u_id) ?? 0,
    })),
  };
}
  // ============================================================
  // 5. INTERVENTION REPORT
  // ============================================================

  private async getInterventionReport(
    dateRange: DateRange,
    query: PlatformReportsQueryDto,
  ): Promise<InterventionReportSummary> {
    const baseQb = () => {
      const qb = this.interventionRepo
        .createQueryBuilder('i')
        .where('i.created_at BETWEEN :start AND :end', {
          start: dateRange.startDate,
          end:   dateRange.endDate,
        });
      if (query.organizationId)
        qb.andWhere('i.organization_id = :orgId', { orgId: query.organizationId });
      if (query.academicYear)
        qb.andWhere('i.academic_year = :year', { year: query.academicYear });
      return qb;
    };

    const [
      total,
      scheduled,
      completed,
      cancelled,
      followUpRequired,
      typeRows,
      priorityRows,
      orgRows,
      trendRows,
    ] = await Promise.all([
      baseQb().getCount(),

      baseQb().andWhere('i.status = :s', { s: InterventionStatus.SCHEDULED }).getCount(),

      baseQb().andWhere('i.status = :s', { s: InterventionStatus.COMPLETED }).getCount(),

      baseQb().andWhere('i.status = :s', { s: InterventionStatus.CANCELLED }).getCount(),

      baseQb().andWhere('i.follow_up_required = true').getCount(),

      // FIX: 'count' alias cannot be used in orderBy — repeat COUNT(*)
      baseQb()
        .select('i.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('i.type')
        .orderBy('COUNT(*)', 'DESC')  // ✅ repeat aggregate, not alias
        .getRawMany(),

      baseQb()
        .select('i.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .where('i.priority IS NOT NULL')
        .groupBy('i.priority')
        .getRawMany(),

      // per-org completion rates
      this.interventionRepo
        .createQueryBuilder('i')
        .select('i.organization_id', 'organizationId')
        .addSelect('org.organizationName', 'organizationName')
        .addSelect('COUNT(*)', 'total')
        .addSelect(
          `SUM(CASE WHEN i.status = '${InterventionStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
          'completed',
        )
        .innerJoin(Organization, 'org', 'org.id = i.organization_id')
        .where('i.created_at BETWEEN :start AND :end', {
          start: dateRange.startDate,
          end:   dateRange.endDate,
        })
        .groupBy('i.organization_id, org.organizationName')
        .getRawMany(),

      // daily trend
      this.interventionRepo
        .createQueryBuilder('i')
        .select(`to_char(i.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, 'period')
        .addSelect('COUNT(*)', 'created')
        .addSelect(
          `SUM(CASE WHEN i.status = '${InterventionStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
          'completed',
        )
        .where('i.created_at BETWEEN :start AND :end', {
          start: dateRange.startDate,
          end:   dateRange.endDate,
        })
        .groupBy('period')
        .orderBy('period', 'ASC')
        .getRawMany(),
    ]);

    const completionRate = total > 0
      ? parseFloat(((completed / total) * 100).toFixed(1))
      : 0;

    return {
      total,
      scheduled,
      completed,
      cancelled,
      followUpRequired,
      completionRate,
      byType: typeRows.map((r) => ({ type: r.type, count: parseInt(r.count, 10) })),
      byPriority: priorityRows.map((r) => ({ priority: r.priority, count: parseInt(r.count, 10) })),
      byOrganisation: orgRows.map((r) => ({
        organizationId:   r.organizationId,
        organizationName: r.organizationName,
        total:            parseInt(r.total, 10),
        completionRate:   parseInt(r.total, 10) > 0
          ? parseFloat(((parseInt(r.completed, 10) / parseInt(r.total, 10)) * 100).toFixed(1))
          : 0,
      })),
      trend: trendRows.map((r) => ({
        period:    r.period,
        created:   parseInt(r.created, 10),
        completed: parseInt(r.completed, 10),
      })),
    };
  }

  // ============================================================
  // 6. REWARD REPORT
  // ============================================================

  private async getRewardReport(
    dateRange: DateRange,
    query: PlatformReportsQueryDto,
  ): Promise<RewardReportSummary> {
    const progQb = () => {
      const qb = this.rewardProgrammeRepo.createQueryBuilder('p');
      if (query.organizationId)
        qb.where('p.organization_id = :orgId', { orgId: query.organizationId });
      return qb;
    };

    const issQb = () => {
      const qb = this.rewardIssuanceRepo
        .createQueryBuilder('i')
        .where('i.created_at BETWEEN :start AND :end', {
          start: dateRange.startDate,
          end:   dateRange.endDate,
        });
      if (query.organizationId)
        qb.andWhere('i.organization_id = :orgId', { orgId: query.organizationId });
      return qb;
    };

    const [
      totalProgrammes,
      activeProgrammes,
      totalIssuances,
      approvedIssuances,
      pendingIssuances,
      rewardTypeRows,
      orgRows,
      topSchoolRows,
    ] = await Promise.all([
      progQb().getCount(),

      progQb().andWhere('p.status = :s', { s: 'active' }).getCount(),

      issQb().getCount(),

      issQb().andWhere('i.status = :s', { s: 'approved' }).getCount(),

      issQb().andWhere('i.status = :s', { s: 'pending' }).getCount(),

      // by reward type
      this.rewardProgrammeRepo
        .createQueryBuilder('p')
        .select('p.reward_type', 'rewardType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('p.reward_type')
        .getRawMany(),

      // per-org
      // FIX: 'issuancesCount' alias cannot be used in orderBy — repeat COUNT(DISTINCT ...)
      this.rewardProgrammeRepo
        .createQueryBuilder('p')
        .select('p.organization_id', 'organizationId')
        .addSelect('org.organizationName', 'organizationName')
        .addSelect('COUNT(DISTINCT p.programme_id)', 'programmesCount')
        .addSelect('COUNT(DISTINCT i.issuance_id)', 'issuancesCount')
        .leftJoin(RewardIssuance, 'i', 'i.programme_id = p.programme_id')
        .innerJoin(Organization, 'org', 'org.id = p.organization_id')
        .groupBy('p.organization_id, org.organizationName')
        .orderBy('COUNT(DISTINCT i.issuance_id)', 'DESC')  // ✅ repeat expression
        .getRawMany(),

      // top schools by issuance count
      // FIX: same — repeat COUNT(*) in orderBy
      this.rewardIssuanceRepo
        .createQueryBuilder('i')
        .select('i.school_id', 'schoolId')
        .addSelect('school.name', 'schoolName')
        .addSelect('org.organizationName', 'organizationName')
        .addSelect('COUNT(*)', 'issuancesCount')
        .addSelect('AVG(i.attendance_rate_snapshot)', 'avgAttendanceRate')
        .innerJoin(School, 'school', 'school.school_id = i.school_id')
        .innerJoin(Organization, 'org', 'org.id = i.organization_id')
        .where('i.school_id IS NOT NULL')
        .groupBy('i.school_id, school.name, org.organizationName')
        .orderBy('COUNT(*)', 'DESC')  // ✅ repeat expression
        .limit(10)
        .getRawMany(),
    ]);

    const approvalRate = totalIssuances > 0
      ? parseFloat(((approvedIssuances / totalIssuances) * 100).toFixed(1))
      : 0;

    return {
      totalProgrammes,
      activeProgrammes,
      totalIssuances,
      approvedIssuances,
      pendingIssuances,
      approvalRate,
      byType: rewardTypeRows.map((r) => ({
        rewardType: r.rewardType,
        count:      parseInt(r.count, 10),
      })),
      byOrganisation: orgRows.map((r) => ({
        organizationId:   r.organizationId,
        organizationName: r.organizationName,
        programmesCount:  parseInt(r.programmesCount, 10),
        issuancesCount:   parseInt(r.issuancesCount, 10),
      })),
      topRecipientSchools: topSchoolRows.map((r) => ({
        schoolId:          r.schoolId,
        schoolName:        r.schoolName,
        organizationName:  r.organizationName,
        issuancesCount:    parseInt(r.issuancesCount, 10),
        avgAttendanceRate: r.avgAttendanceRate
          ? parseFloat(parseFloat(r.avgAttendanceRate).toFixed(1))
          : 0,
      })),
    };
  }

  // ============================================================
  // 7. AUDIT / SECURITY REPORT
  // ============================================================

  private async getAuditReport(
    dateRange: DateRange,
    query: PlatformReportsQueryDto,
  ): Promise<AuditReportSummary> {
    const baseQb = () => {
      const qb = this.auditRepo
        .createQueryBuilder('log')
        .where('log.timestamp BETWEEN :start AND :end', {
          start: dateRange.startDate,
          end:   dateRange.endDate,
        });
      if (query.organizationId)
        qb.andWhere('log.organizationId = :orgId', { orgId: query.organizationId });
      return qb;
    };

    const [
      totalActions,
      uniqueUsersRow,
      platformRows,
      actionRows,
      loginCount,
      passwordResets,
      suspensions,
      deletions,
      trendRows,
    ] = await Promise.all([
      baseQb().getCount(),

      baseQb()
        .select('COUNT(DISTINCT log.userId)', 'count')
        .getRawOne(),

      baseQb()
        .select('log.platform', 'platform')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.platform')
        .getRawMany(),

      // FIX: 'count' alias cannot be used in orderBy — repeat COUNT(*)
      baseQb()
        .select('log.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.action')
        .orderBy('COUNT(*)', 'DESC')  // ✅ repeat aggregate, not alias
        .limit(10)
        .getRawMany(),

      baseQb().andWhere(`log.action = 'User Login'`).getCount(),
      baseQb().andWhere(`log.action = 'Password Reset'`).getCount(),
      baseQb().andWhere(`log.action = 'Mentor Suspended'`).getCount(),
      baseQb().andWhere(`log.action = 'User Deleted'`).getCount(),

      // daily trend
      baseQb()
        .select(`to_char(log.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')`, 'period')
        .addSelect('COUNT(*)', 'count')
        .groupBy('period')
        .orderBy('period', 'ASC')
        .getRawMany(),
    ]);

    const uniqueUsers = parseInt(uniqueUsersRow?.count ?? '0', 10);
    const totalForPct = totalActions || 1;

    return {
      totalActions,
      uniqueUsers,
      loginCount,
      passwordResets,
      suspensions,
      deletions,
      byPlatform: platformRows.map((r) => ({
        platform:   r.platform,
        count:      parseInt(r.count, 10),
        percentage: parseFloat(((parseInt(r.count, 10) / totalForPct) * 100).toFixed(1)),
      })),
      byAction: actionRows.map((r) => ({
        action: r.action,
        count:  parseInt(r.count, 10),
      })),
      activityTrend: trendRows.map((r) => ({
        period: r.period,
        count:  parseInt(r.count, 10),
      })),
    };
  }
}