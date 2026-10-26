// platform-demographics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import { AttendanceStatus } from '../common/enum/attendance.enums';
import { OrganizationStatus } from '../common/enum/organization-status';
import {
  PlatformDemographicsQueryDto,
  DemographicsTimeRange,
} from './dto/platform-demographics-query.dto';
import {
  PlatformDemographicsResponseDto,
  DemographicsStatCard,
  AgeDistributionData,
  GenderDistributionData,
  RegionalData,
  AttendanceByDemographic,
  EquityRadarData,
  EquityInsight,
} from './dto/platform-demographics-response.dto';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class PlatformDemographicsService {
  private readonly logger = new Logger(PlatformDemographicsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,
  ) {}

  async getDemographicsAnalytics(
    query: PlatformDemographicsQueryDto,
  ): Promise<PlatformDemographicsResponseDto> {
    this.logger.log('Fetching demographics analytics...');

    const dateRange = this.calculateDateRange(query);

    const [
      ageDistribution,
      genderDistribution,
      regionalData,
      attendanceByAge,
      attendanceByGender,
      totalStudents,
      regionsCount,
    ] = await Promise.all([
      this.getAgeDistribution(query),
      this.getGenderDistribution(query),
      this.getRegionalData(dateRange, query),
      this.getAttendanceByAge(dateRange, query),
      this.getAttendanceByGender(dateRange, query),
      this.getTotalStudents(query),
      this.getRegionsCount(query),
    ]);

    const keyStats = this.generateKeyStats(
      totalStudents,
      regionsCount,
      genderDistribution,
      ageDistribution,
    );

    const equityRadarData = await this.generateEquityRadarData(
      attendanceByGender,
      genderDistribution,
      dateRange,
      query,
    );

    const equityInsights = this.generateEquityInsights(
      genderDistribution,
      ageDistribution,
      attendanceByAge,
      attendanceByGender,
    );

    return {
      keyStats,
      ageDistribution,
      genderDistribution,
      regionalData,
      attendanceByAge,
      attendanceByGender,
      equityRadarData,
      equityInsights,
      metadata: {
        totalStudents,
        regionsCovered: regionsCount,
        genderBalanceRatio: this.calculateGenderRatio(genderDistribution),
        ageRange: this.calculateAgeRange(ageDistribution),
        dataStartDate: dateRange.startDate.toISOString(),
        dataEndDate: dateRange.endDate.toISOString(),
        generatedAt: new Date(),
      },
    };
  }

  // ============================================
  // DATE RANGE CALCULATIONS
  // ============================================

  private calculateDateRange(query: PlatformDemographicsQueryDto): DateRange {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (
      query.timeRange === DemographicsTimeRange.CUSTOM &&
      query.startDate &&
      query.endDate
    ) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.timeRange) {
        case DemographicsTimeRange.LAST_30_DAYS:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case DemographicsTimeRange.LAST_3_MONTHS:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        case DemographicsTimeRange.LAST_6_MONTHS:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
          break;
        case DemographicsTimeRange.LAST_12_MONTHS:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 12);
          break;
        case DemographicsTimeRange.CURRENT_YEAR:
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 6);
      }
    }

    return { startDate, endDate };
  }

  // ============================================
  // AGE DISTRIBUTION - FIXED
  // ============================================

  private async getAgeDistribution(
    query: PlatformDemographicsQueryDto,
  ): Promise<AgeDistributionData[]> {
    // Get all students with their date of birth
    const students = await this.studentRepo
      .createQueryBuilder('student')
      .select('student.date_of_birth', 'dateOfBirth') // Use actual column name
      .leftJoin('student.school', 'school')
      .where('student.date_of_birth IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .getRawMany();

    this.logger.log(`Found ${students.length} students with date of birth`);

    // Dynamic age bands that cover ALL ages
    const ageBands: Record<string, number> = {
      '0-4': 0,
      '5-7': 0,
      '8-10': 0,
      '11-13': 0,
      '14-16': 0,
      '17-19': 0,
      '20+': 0,
    };

    const now = new Date();
    students.forEach((student) => {
      if (student.dateOfBirth) {
        const age = this.calculateAge(new Date(student.dateOfBirth), now);
        
        if (age < 0) {
          // Invalid future date, skip
          return;
        } else if (age <= 4) {
          ageBands['0-4']++;
        } else if (age >= 5 && age <= 7) {
          ageBands['5-7']++;
        } else if (age >= 8 && age <= 10) {
          ageBands['8-10']++;
        } else if (age >= 11 && age <= 13) {
          ageBands['11-13']++;
        } else if (age >= 14 && age <= 16) {
          ageBands['14-16']++;
        } else if (age >= 17 && age <= 19) {
          ageBands['17-19']++;
        } else {
          ageBands['20+']++;
        }
      }
    });

    // Return all bands (including those with 0 students for consistency)
    return Object.entries(ageBands).map(([age, students]) => ({
      age,
      students,
    }));
  }

  private calculateAge(birthDate: Date, currentDate: Date): number {
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  // ============================================
  // GENDER DISTRIBUTION
  // ============================================

  private async getGenderDistribution(
    query: PlatformDemographicsQueryDto,
  ): Promise<GenderDistributionData[]> {
    const result = await this.studentRepo
      .createQueryBuilder('student')
      .select('student.gender', 'gender')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('student.school', 'school')
      .where('student.gender IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .groupBy('student.gender')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + parseInt(r.count), 0);

    const genderColors: Record<string, string> = {
      Female: '#ec4899',
      female: '#ec4899',
      Male: '#3b82f6',
      male: '#3b82f6',
    };

    return result.map((r) => ({
      name: this.capitalizeGender(r.gender),
      value: parseInt(r.count),
      percentage: total > 0 ? (parseInt(r.count) / total) * 100 : 0,
      color: genderColors[r.gender] || '#64748b',
    }));
  }

  private capitalizeGender(gender: string): string {
    if (!gender) return 'Unknown';
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  }

  // ============================================
  // REGIONAL DATA - FIXED
  // ============================================

  private async getRegionalData(
    dateRange: DateRange,
    query: PlatformDemographicsQueryDto,
  ): Promise<RegionalData[]> {
    const stateCondition = query.state ? 'school.state = :state' : '1=1';

    // Get student counts per region/state
    const studentCounts = await this.schoolRepo
      .createQueryBuilder('school')
      .select('school.state', 'region')
      .addSelect('COUNT(DISTINCT student.student_id)', 'students')
      .addSelect('COUNT(DISTINCT school.school_id)', 'schoolCount')
      .leftJoin('school.students', 'student')
      .where(stateCondition, { state: query.state })
      .andWhere('school.state IS NOT NULL') // Only include schools with state
      .groupBy('school.state')
      .getRawMany();

    this.logger.log(`Found ${studentCounts.length} regions with students`);

    // Get attendance rates per region/state
    const attendanceRates = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('school.state', 'region')
      .addSelect(
        `ROUND(AVG(CASE WHEN att.status = :present THEN 100 ELSE 0 END)::numeric, 2)`,
        'attendance',
      )
      .innerJoin('att.school', 'school')
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .andWhere(stateCondition, { state: query.state })
      .andWhere('school.state IS NOT NULL')
      .groupBy('school.state')
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawMany();

    const attendanceMap = new Map(
      attendanceRates.map((a) => [a.region, parseFloat(a.attendance || '0')]),
    );

    // REMOVED PRIVACY FILTER - Return all regions regardless of size
    // You can add it back later if needed: .filter((r) => r.students >= 10)
    return studentCounts
      .map((s) => ({
        region: s.region || 'Unknown',
        state: s.region,
        students: parseInt(s.students || '0'),
        attendance: attendanceMap.get(s.region) || 0,
        schoolCount: parseInt(s.schoolCount || '0'),
      }))
      .filter((r) => r.students > 0); // Only filter out regions with 0 students
  }

  // ============================================
  // ATTENDANCE BY AGE - FIXED
  // ============================================

  private async getAttendanceByAge(
    dateRange: DateRange,
    query: PlatformDemographicsQueryDto,
  ): Promise<AttendanceByDemographic[]> {
    // Get attendance records with student DOB
    const records = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('student.date_of_birth', 'dateOfBirth') // Use actual column name
      .addSelect('att.status', 'status')
      .innerJoin('att.student', 'student')
      .leftJoin('att.school', 'school')
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .andWhere('student.date_of_birth IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .getRawMany();

    this.logger.log(`Found ${records.length} attendance records with DOB`);

    // Dynamic age bands matching getAgeDistribution
    const ageBands: Record<string, { total: number; present: number }> = {
      '0-4': { total: 0, present: 0 },
      '5-7': { total: 0, present: 0 },
      '8-10': { total: 0, present: 0 },
      '11-13': { total: 0, present: 0 },
      '14-16': { total: 0, present: 0 },
      '17-19': { total: 0, present: 0 },
      '20+': { total: 0, present: 0 },
    };

    records.forEach((record) => {
      if (record.dateOfBirth) {
        const age = this.calculateAge(
          new Date(record.dateOfBirth),
          new Date(),
        );
        
        let band: string | null = null;

        if (age < 0) {
          return; // Invalid future date
        } else if (age <= 4) {
          band = '0-4';
        } else if (age >= 5 && age <= 7) {
          band = '5-7';
        } else if (age >= 8 && age <= 10) {
          band = '8-10';
        } else if (age >= 11 && age <= 13) {
          band = '11-13';
        } else if (age >= 14 && age <= 16) {
          band = '14-16';
        } else if (age >= 17 && age <= 19) {
          band = '17-19';
        } else {
          band = '20+';
        }

        if (band && ageBands[band]) {
          ageBands[band].total++;
          if (record.status === AttendanceStatus.PRESENT) {
            ageBands[band].present++;
          }
        }
      }
    });

    // REMOVED PRIVACY FILTER - Return all age bands
    return Object.entries(ageBands)
      .map(([age, data]) => ({
        category: age,
        rate: data.total > 0 ? (data.present / data.total) * 100 : 0,
        students: data.total,
      }))
      .filter((item) => item.students > 0); // Only filter bands with no data
  }

  // ============================================
  // ATTENDANCE BY GENDER - FIXED
  // ============================================

  private async getAttendanceByGender(
    dateRange: DateRange,
    query: PlatformDemographicsQueryDto,
  ): Promise<AttendanceByDemographic[]> {
    const result = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('student.gender', 'gender')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN att.status = :present THEN 1 ELSE 0 END)`,
        'present',
      )
      .innerJoin('att.student', 'student')
      .leftJoin('att.school', 'school')
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .andWhere('student.gender IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .groupBy('student.gender')
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawMany();

    // REMOVED PRIVACY FILTER
    return result.map((r) => ({
      category: this.capitalizeGender(r.gender),
      rate:
        parseInt(r.total) > 0
          ? (parseInt(r.present) / parseInt(r.total)) * 100
          : 0,
      students: parseInt(r.total),
    }));
  }

  // ============================================
  // KEY STATS
  // ============================================

  private async getTotalStudents(
    query: PlatformDemographicsQueryDto,
  ): Promise<number> {
    if (!query.state) {
      return await this.studentRepo.count();
    }

    const result = await this.studentRepo
      .createQueryBuilder('student')
      .leftJoin('student.school', 'school')
      .where('school.state = :state', { state: query.state })
      .getCount();

    return result;
  }

  private async getRegionsCount(
    query: PlatformDemographicsQueryDto,
  ): Promise<number> {
    const result = await this.schoolRepo
      .createQueryBuilder('school')
      .select('COUNT(DISTINCT school.state)', 'count')
      .where(query.state ? 'school.state = :state' : 'school.state IS NOT NULL', {
        state: query.state,
      })
      .getRawOne();

    return parseInt(result?.count || '0');
  }

  private generateKeyStats(
    totalStudents: number,
    regionsCount: number,
    genderDistribution: GenderDistributionData[],
    ageDistribution: AgeDistributionData[],
  ): DemographicsStatCard[] {
    const femaleData = genderDistribution.find((g) => g.name === 'Female');
    const maleData = genderDistribution.find((g) => g.name === 'Male');

    const femalePercentage = femaleData?.percentage || 0;
    const malePercentage = maleData?.percentage || 0;

    // Calculate actual age range from data
    const ageRange = this.calculateAgeRange(ageDistribution);

    return [
      {
        label: 'Total Students',
        value: totalStudents.toLocaleString(),
        sublabel: 'Platform-wide',
      },
      {
        label: 'Regions Covered',
        value: regionsCount,
        sublabel: 'Across platform',
      },
      {
        label: 'Gender Balance',
        value: `${Math.round(femalePercentage)}/${Math.round(malePercentage)}`,
        sublabel: 'F/M ratio',
      },
      {
        label: 'Age Range',
        value: ageRange,
        sublabel: 'Years',
      },
    ];
  }

  // ============================================
  // EQUITY RADAR DATA
  // ============================================

  private async generateEquityRadarData(
    attendanceByGender: AttendanceByDemographic[],
    genderDistribution: GenderDistributionData[],
    dateRange: DateRange,
    query: PlatformDemographicsQueryDto,
  ): Promise<EquityRadarData[]> {
    const femaleAttendance =
      attendanceByGender.find((a) => a.category === 'Female')?.rate || 0;
    const maleAttendance =
      attendanceByGender.find((a) => a.category === 'Male')?.rate || 0;

    const femaleEnrollment =
      genderDistribution.find((g) => g.name === 'Female')?.percentage || 0;
    const maleEnrollment =
      genderDistribution.find((g) => g.name === 'Male')?.percentage || 0;

    // Calculate retention from enrollment status
    const retentionData = await this.getRetentionByGender(query);
    const femaleRetention =
      retentionData.find((r) => r.gender === 'Female')?.rate || 0;
    const maleRetention =
      retentionData.find((r) => r.gender === 'Male')?.rate || 0;

    // Calculate engagement from active students
    const engagementData = await this.getEngagementByGender(dateRange, query);
    const femaleEngagement =
      engagementData.find((e) => e.gender === 'Female')?.rate || 0;
    const maleEngagement =
      engagementData.find((e) => e.gender === 'Male')?.rate || 0;

    return [
      {
        dimension: 'Attendance',
        female: Math.round(femaleAttendance),
        male: Math.round(maleAttendance),
      },
      {
        dimension: 'Enrollment',
        female: Math.round(femaleEnrollment),
        male: Math.round(maleEnrollment),
      },
      {
        dimension: 'Retention',
        female: Math.round(femaleRetention),
        male: Math.round(maleRetention),
      },
      {
        dimension: 'Engagement',
        female: Math.round(femaleEngagement),
        male: Math.round(maleEngagement),
      },
    ];
  }

  // Calculate retention rate (enrolled students who are still active) - FIXED
  private async getRetentionByGender(
    query: PlatformDemographicsQueryDto,
  ): Promise<{ gender: string; rate: number }[]> {
    const result = await this.studentRepo
      .createQueryBuilder('student')
      .select('student.gender', 'gender')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN student.is_active = true THEN 1 ELSE 0 END)`, // Use actual column name
        'enrolled',
      )
      .leftJoin('student.school', 'school')
      .where('student.gender IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .groupBy('student.gender')
      .getRawMany();

    return result.map((r) => ({
      gender: this.capitalizeGender(r.gender),
      rate:
        parseInt(r.total) > 0
          ? (parseInt(r.enrolled) / parseInt(r.total)) * 100
          : 0,
    }));
  }

  // Calculate engagement rate (students with attendance records in the period) - FIXED
  private async getEngagementByGender(
    dateRange: DateRange,
    query: PlatformDemographicsQueryDto,
  ): Promise<{ gender: string; rate: number }[]> {
    // Get total students by gender
    const totalStudents = await this.studentRepo
      .createQueryBuilder('student')
      .select('student.gender', 'gender')
      .addSelect('COUNT(DISTINCT student.student_id)', 'total')
      .leftJoin('student.school', 'school')
      .where('student.gender IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .groupBy('student.gender')
      .getRawMany();

    // Get active students (with attendance records) by gender
    const activeStudents = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('student.gender', 'gender')
      .addSelect('COUNT(DISTINCT att.student_id)', 'active')
      .innerJoin('att.student', 'student')
      .leftJoin('att.school', 'school')
      .where('att.attendance_date BETWEEN :startDate AND :endDate', {
        startDate: this.formatDate(dateRange.startDate),
        endDate: this.formatDate(dateRange.endDate),
      })
      .andWhere('student.gender IS NOT NULL')
      .andWhere(query.state ? 'school.state = :state' : '1=1', {
        state: query.state,
      })
      .groupBy('student.gender')
      .getRawMany();

    const activeMap = new Map(
      activeStudents.map((a) => [a.gender, parseInt(a.active)]),
    );

    return totalStudents.map((t) => ({
      gender: this.capitalizeGender(t.gender),
      rate:
        parseInt(t.total) > 0
          ? ((activeMap.get(t.gender) || 0) / parseInt(t.total)) * 100
          : 0,
    }));
  }

  // ============================================
  // EQUITY INSIGHTS
  // ============================================

  private generateEquityInsights(
    genderDistribution: GenderDistributionData[],
    ageDistribution: AgeDistributionData[],
    attendanceByAge: AttendanceByDemographic[],
    attendanceByGender: AttendanceByDemographic[],
  ): EquityInsight[] {
    const insights: EquityInsight[] = [];

    // Gender balance insight
    const femalePercent =
      genderDistribution.find((g) => g.name === 'Female')?.percentage || 0;
    const malePercent =
      genderDistribution.find((g) => g.name === 'Male')?.percentage || 0;
    const genderGap = Math.abs(femalePercent - malePercent);

    if (genderGap < 10) {
      insights.push({
        type: 'positive',
        title: 'Balanced Enrollment',
        description: `Gender distribution is relatively balanced (${Math.round(femalePercent)}% F / ${Math.round(malePercent)}% M)`,
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Gender Imbalance',
        description: `Notable gender gap detected (${Math.round(femalePercent)}% F / ${Math.round(malePercent)}% M)`,
      });
    }

    // Attendance parity insight
    const femaleAttendance =
      attendanceByGender.find((a) => a.category === 'Female')?.rate || 0;
    const maleAttendance =
      attendanceByGender.find((a) => a.category === 'Male')?.rate || 0;
    const attendanceGap = Math.abs(femaleAttendance - maleAttendance);

    if (attendanceGap < 3 && femaleAttendance > 80 && maleAttendance > 80) {
      insights.push({
        type: 'positive',
        title: 'Attendance Parity',
        description: 'Both genders show strong attendance rates with minimal gap',
      });
    }

    // Age distribution insight - only if we have students with ages
    const studentsWithAge = ageDistribution.filter(band => band.students > 0);
    if (studentsWithAge.length > 0) {
      const peakAgeBand = studentsWithAge.reduce((max, current) =>
        current.students > max.students ? current : max,
      );
      
      insights.push({
        type: 'info',
        title: `Age ${peakAgeBand.age} Peak`,
        description: `Highest student concentration in ${peakAgeBand.age} age band`,
      });
    }

    // Teen attendance insight - if we have data for this age group
    const teenAttendance = attendanceByAge.find((a) => a.category === '14-16');
    if (teenAttendance && teenAttendance.students > 0 && teenAttendance.rate < 85) {
      insights.push({
        type: 'warning',
        title: 'Teen Attendance Dip',
        description: `Attendance decline in 14-16 age group (${Math.round(teenAttendance.rate)}%) needs attention`,
      });
    }

    return insights;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateGenderRatio(
    genderDistribution: GenderDistributionData[],
  ): string {
    const female =
      genderDistribution.find((g) => g.name === 'Female')?.percentage || 0;
    const male =
      genderDistribution.find((g) => g.name === 'Male')?.percentage || 0;
    return `${Math.round(female)}/${Math.round(male)}`;
  }

  private calculateAgeRange(ageDistribution: AgeDistributionData[]): string {
    if (ageDistribution.length === 0) return 'N/A';

    // Extract min and max ages from the age bands that have students
    const ageBandsWithStudents = ageDistribution.filter(
      (band) => band.students > 0,
    );

    if (ageBandsWithStudents.length === 0) return 'N/A';

    // Parse age ranges (e.g., "5-7" -> [5, 7], "20+" -> [20, 99])
    const allAges = ageBandsWithStudents.flatMap((band) => {
      if (band.age === '20+') {
        return [20]; // Just use 20 as the minimum
      }
      const [min, max] = band.age.split('-').map(Number);
      return [min, max];
    });

    const minAge = Math.min(...allAges);
    const maxAge = Math.max(...allAges);

    // Special case for "20+" band
    const has20Plus = ageBandsWithStudents.some((band) => band.age === '20+');
    if (has20Plus && maxAge === 20) {
      return `${minAge}+`;
    }

    return `${minAge}-${maxAge}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}