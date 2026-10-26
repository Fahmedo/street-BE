// platform-overview.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from 'src/organization/entities/organization.entity';
import { OrganizationStatus } from 'src/common/enum/organization-status';
import { School } from 'src/school/entities/school.entity';
import { StudentProfile } from 'src/student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { AttendanceStatus } from 'src/common/enum/attendance.enums';
import { Class } from 'src/school/entities/school-class.entity'; // ✅ Add import
import { Role } from 'src/common/enum/roles.enum'; // ✅ Add import
import {
  PlatformOverviewResponseDto,
  PlatformDateRangeFilter,
  GrowthDataPointDto,
  AttendanceDataPointDto,
  RecentActivityDto,
} from './dto/platform-overview.dto';

@Injectable()
export class PlatformOverviewService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(Class) // ✅ Add Class repository
    private readonly classRepo: Repository<Class>,
  ) {}

  async getOverview(
    range: PlatformDateRangeFilter = PlatformDateRangeFilter.THIS_MONTH,
    userRole?: string, // ✅ Add userRole parameter
  ): Promise<PlatformOverviewResponseDto> {
    const { startDate, endDate } = this.calculateDateRange(range);

    // ✅ Check if user is School Manager
    const isSchoolManager = userRole === Role.SCHOOL_MANAGER;

    const [
      metrics,
      organizationStatus,
      growthData,
      attendanceData,
      recentActivity,
    ] = await Promise.all([
      this.getPlatformMetrics(startDate, endDate, isSchoolManager),
      isSchoolManager ? null : this.getOrganizationStatus(),
      this.getGrowthData(isSchoolManager),
      isSchoolManager ? [] : this.getAttendanceData(), // ✅ Skip for School Manager
      this.getRecentActivity(isSchoolManager),
    ]);

    return {
      message: 'Platform overview retrieved successfully',
      metrics,
      organizationStatus: organizationStatus ?? undefined,
      growthData,
      attendanceData,
      recentActivity,
    };
  }

  // ─── DATE RANGE CALCULATOR ──────────────────────────────────────────────
  private calculateDateRange(range: PlatformDateRangeFilter): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    const endDate: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    switch (range) {
      case PlatformDateRangeFilter.TODAY:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
        break;

      case PlatformDateRangeFilter.THIS_WEEK:
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;

      case PlatformDateRangeFilter.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;

      case PlatformDateRangeFilter.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;

      case PlatformDateRangeFilter.LAST_7_DAYS:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;

      case PlatformDateRangeFilter.LAST_30_DAYS:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;

      case PlatformDateRangeFilter.LAST_90_DAYS:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
        break;

      case PlatformDateRangeFilter.ALL_TIME:
        startDate = new Date(2020, 0, 1, 0, 0, 0);
        break;

      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  // ─── ✅ UPDATED: PLATFORM METRICS WITH ROLE-BASED FILTERING ─────────────
  private async getPlatformMetrics(
    startDate: Date,
    endDate: Date,
    isSchoolManager: boolean,
  ) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    if (isSchoolManager) {
      // ✅ SCHOOL MANAGER: Only schools & classes metrics
      const [totalSchools, totalClasses] = await Promise.all([
        this.schoolRepo.count({ where: { isActive: true } }),
        this.classRepo.count({ where: { isActive: true } }),
      ]);

      // Schools added in range
      const schoolsInRange = await this.schoolRepo
        .createQueryBuilder('school')
        .where('school.is_active = :isActive', { isActive: true })
        .andWhere('school.created_at >= :startDate', { startDate })
        .andWhere('school.created_at <= :endDate', { endDate })
        .getCount();

      // Classes added in range
      const classesInRange = await this.classRepo
        .createQueryBuilder('class')
        .where('class.is_active = :isActive', { isActive: true })
        .andWhere('class.created_at >= :startDate', { startDate })
        .andWhere('class.created_at <= :endDate', { endDate })
        .getCount();

      return {
        totalOrganizations: 0,
        totalSchools,
        totalStudents: totalClasses, // ✅ Show total classes instead of students
        avgAttendanceRate: 0,
        organizationsChange: '0',
        schoolsChange: schoolsInRange > 0 ? `+${schoolsInRange}` : '0',
        studentsChange: classesInRange > 0 ? `+${classesInRange}` : '0', // ✅ Classes change
        attendanceChange: '+0%',
      };
    }

    // ✅ SUPER ADMIN: Full metrics
    const [totalOrganizations, totalSchools, totalStudents] = await Promise.all(
      [
        this.orgRepo.count(),
        this.schoolRepo.count({ where: { isActive: true } }),
        this.studentRepo.count({ where: { isActive: true } }),
      ],
    );

    // Organizations added in range
    const orgsInRange = await this.orgRepo
      .createQueryBuilder('org')
      .where('org.createdAt >= :startDate', { startDate })
      .andWhere('org.createdAt <= :endDate', { endDate })
      .getCount();

    // Schools added in range
    const schoolsInRange = await this.schoolRepo
      .createQueryBuilder('school')
      .where('school.is_active = :isActive', { isActive: true })
      .andWhere('school.created_at >= :startDate', { startDate })
      .andWhere('school.created_at <= :endDate', { endDate })
      .getCount();

    // Students enrolled in range
    const studentsInRange = await this.studentRepo
      .createQueryBuilder('student')
      .where('student.is_active= :status', { status: true })
      .andWhere('student.created_at >= :startDate', { startDate })
      .andWhere('student.created_at <= :endDate', { endDate })
      .getCount();

    // Average attendance rate for range
    const attendanceInRange = await this.attendanceRepo
      .createQueryBuilder('a')
      .select(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
        'rate',
      )
      .where('a.attendance_date >= :startDate', { startDate: startDateStr })
      .andWhere('a.attendance_date <= :endDate', { endDate: endDateStr })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne<{ rate: string }>();

    const avgAttendanceRate = Number(
      Number(attendanceInRange?.rate ?? 0).toFixed(1),
    );

    // Previous period comparison
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
      .where('a.attendance_date >= :startDate', { startDate: prevStartDateStr })
      .andWhere('a.attendance_date <= :endDate', { endDate: prevEndDateStr })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne<{ rate: string }>();

    const prevAttendanceRate = Number(
      Number(attendancePrevPeriod?.rate ?? 0).toFixed(1),
    );
    const attendanceChange = Number(
      (avgAttendanceRate - prevAttendanceRate).toFixed(1),
    );

    return {
      totalOrganizations,
      totalSchools,
      totalStudents,
      avgAttendanceRate,
      organizationsChange: orgsInRange > 0 ? `+${orgsInRange}` : '0',
      schoolsChange: schoolsInRange > 0 ? `+${schoolsInRange}` : '0',
      studentsChange: studentsInRange > 0 ? `+${studentsInRange}` : '0',
      attendanceChange:
        attendanceChange >= 0
          ? `+${attendanceChange}%`
          : `${attendanceChange}%`,
    };
  }

  // ─── ORGANIZATION STATUS ────────────────────────────────────────────────
  private async getOrganizationStatus() {
    const total = await this.orgRepo.count();

    const active = await this.orgRepo.count({
      where: { status: OrganizationStatus.ACTIVE },
    });

    const pendingSetup = await this.orgRepo.count({
      where: { status: OrganizationStatus.PENDING },
    });

    const suspended = await this.orgRepo.count({
      where: { status: OrganizationStatus.SUSPENDED },
    });

    return {
      active,
      pendingSetup,
      suspended,
      total,
    };
  }

  // ─── ✅ UPDATED: GROWTH DATA WITH ROLE-BASED FILTERING ──────────────────
  private async getGrowthData(
    isSchoolManager: boolean,
  ): Promise<GrowthDataPointDto[]> {
    const growthData: GrowthDataPointDto[] = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const endOfMonth = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      if (isSchoolManager) {
        // ✅ SCHOOL MANAGER: Only schools & classes
        const [schools, classes] = await Promise.all([
          this.schoolRepo
            .createQueryBuilder('school')
            .where('school.is_active = :isActive', { isActive: true })
            .andWhere('school.created_at <= :endDate', { endDate: endOfMonth })
            .getCount(),
          this.classRepo
            .createQueryBuilder('class')
            .where('class.is_active = :isActive', { isActive: true })
            .andWhere('class.created_at <= :endDate', { endDate: endOfMonth })
            .getCount(),
        ]);

        growthData.push({
          month: monthNames[date.getMonth()],
          orgs: 0,
          schools,
          students: classes, // ✅ Show classes instead of students
        });
      } else {
        // ✅ SUPER ADMIN: Full data
        const [orgs, schools, students] = await Promise.all([
          this.orgRepo
            .createQueryBuilder('org')
            .where('org.createdAt <= :endDate', { endDate: endOfMonth })
            .getCount(),
          this.schoolRepo
            .createQueryBuilder('school')
            .where('school.is_active = :isActive', { isActive: true })
            .andWhere('school.created_at <= :endDate', { endDate: endOfMonth })
            .getCount(),
          this.studentRepo
            .createQueryBuilder('student')
            .where('student.is_active= :status', { status: true })
            .andWhere('student.created_at <= :endDate', { endDate: endOfMonth })
            .getCount(),
        ]);

        growthData.push({
          month: monthNames[date.getMonth()],
          orgs,
          schools,
          students,
        });
      }
    }

    return growthData;
  }

  // ─── ATTENDANCE DATA (LAST 4 WEEKS) ─────────────────────────────────────
  private async getAttendanceData(): Promise<AttendanceDataPointDto[]> {
    const attendanceData: AttendanceDataPointDto[] = [];

    for (let i = 3; i >= 0; i--) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const attendanceRaw = await this.attendanceRepo
        .createQueryBuilder('a')
        .select(
          `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
          'rate',
        )
        .where('a.attendance_date >= :startDate', { startDate: startDateStr })
        .andWhere('a.attendance_date <= :endDate', { endDate: endDateStr })
        .setParameter('present', AttendanceStatus.PRESENT)
        .getRawOne<{ rate: string }>();

      const rate = Number(Number(attendanceRaw?.rate ?? 0).toFixed(0));

      attendanceData.push({
        week: `W${4 - i}`,
        rate,
      });
    }

    return attendanceData;
  }

  // ─── ✅ UPDATED: RECENT ACTIVITY WITH ROLE-BASED FILTERING ──────────────
  private async getRecentActivity(
    isSchoolManager: boolean,
  ): Promise<RecentActivityDto[]> {
    const activities: RecentActivityDto[] = [];

    if (isSchoolManager) {
      // ✅ SCHOOL MANAGER: Only school & class activities

      // Recent schools
      const recentSchools = await this.schoolRepo.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: 3,
      });

      recentSchools.forEach((school) => {
        const timeDiff = Date.now() - new Date(school.createdAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);

        activities.push({
          id: school.schoolId,
          type: 'new',
          message: `New school created: ${school.name}`,
          time:
            daysAgo > 0
              ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
              : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`,
          timestamp: new Date(school.createdAt),
        });
      });

      // Recent classes
      const recentClasses = await this.classRepo.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: 2,
        relations: ['school'],
      });

      recentClasses.forEach((classItem) => {
        const timeDiff = Date.now() - new Date(classItem.createdAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(hoursAgo / 24);

        activities.push({
          id: classItem.classId,
          type: 'update',
          message: `New class created: ${classItem.className} at ${classItem.school?.name ?? 'Unknown School'}`,
          time:
            daysAgo > 0
              ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
              : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`,
          timestamp: new Date(classItem.createdAt),
        });
      });

      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);
    }

    // ✅ SUPER ADMIN: Full activities (original logic)

    // Get recent organizations
    const recentOrgs = await this.orgRepo.find({
      order: { createdAt: 'DESC' },
      take: 2,
    });

    recentOrgs.forEach((org) => {
      const timeDiff = Date.now() - new Date(org.createdAt).getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      const daysAgo = Math.floor(hoursAgo / 24);

      activities.push({
        id: org.id,
        type: 'new',
        message: `New organisation onboarded: ${org.organizationName}`,
        time:
          daysAgo > 0
            ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
            : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`,
        timestamp: new Date(org.createdAt),
      });
    });

    // Get recently activated organizations
    const recentlyActivated = await this.orgRepo.find({
      where: { status: OrganizationStatus.ACTIVE },
      order: { updatedAt: 'DESC' },
      take: 1,
      relations: ['organizationSchools'],
    });

    if (recentlyActivated.length > 0) {
      const org = recentlyActivated[0];
      const schoolCount = org.organizationSchools?.length ?? 0;
      const studentCount = await this.studentRepo.count({
        where: { registeredByOrgId: org.id },
      });

      const timeDiff = Date.now() - new Date(org.updatedAt).getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));

      activities.push({
        id: `${org.id}-activated`,
        type: 'update',
        message: `${org.organizationName} activated (${schoolCount} schools, ${studentCount} students)`,
        time: `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`,
        timestamp: new Date(org.updatedAt),
      });
    }

    // Platform stats
    const totalRecords = await this.attendanceRepo.count();
    if (totalRecords > 0) {
      activities.push({
        id: 'platform-stats',
        type: 'update',
        message: `Platform attendance submission rate: 98.5%`,
        time: '1 day ago',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
    }

    // Sort by timestamp
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }
}
