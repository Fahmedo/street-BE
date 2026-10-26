import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { School } from '../school/entities/school.entity';
import { Class } from '../school/entities/school-class.entity';
import {
  DemographicsQueryDto,
  DemographicsDateRange,
  DemographicsDashboardDto,
  RegionDto,
  AgeBandDto,
  GenderDto,
  SchoolTypeDto,
  GrowthTrendDto,
  DemographicComparisonDto,
  InitiativeReachDto,
} from './dto/demographics.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveStartDate(
  range: DemographicsDateRange = DemographicsDateRange.YEAR,
): Date {
  const now = new Date();
  switch (range) {
    case DemographicsDateRange.MONTH:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case DemographicsDateRange.QUARTER:
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case DemographicsDateRange.YEAR:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case DemographicsDateRange.ALL:
      return new Date(0); // epoch = no lower bound
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

/** Returns "Jan", "Feb", etc. */
function shortMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/** Classify age in years into a band label */
function ageBand(ageYears: number): string {
  if (ageYears <= 7) return '5-7 years';
  if (ageYears <= 10) return '8-10 years';
  if (ageYears <= 13) return '11-13 years';
  if (ageYears <= 16) return '14-16 years';
  return '17+ years';
}

const AGE_BAND_ORDER = [
  '5-7 years',
  '8-10 years',
  '11-13 years',
  '14-16 years',
  '17+ years',
];

/** Density tier based on student count */
function densityTier(count: number): 'high' | 'medium' | 'low' {
  if (count >= 2000) return 'high';
  if (count >= 1000) return 'medium';
  return 'low';
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class DemographicsService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
  ) {}

  async getDashboard(
    organizationId: string,
    query: DemographicsQueryDto,
  ): Promise<DemographicsDashboardDto> {
    const startDate = resolveStartDate(query.dateRange);

    // ── Base student query ───────────────────────────────────────────────────
    const studentWhere: any = { organizationId };
    if (query.schoolType) studentWhere.schoolType = query.schoolType;
    if (query.region) studentWhere.schoolId = query.region;

    const [allStudents, allSchools] = await Promise.all([
      this.studentRepo.find({
        where: {
          createdAt: MoreThanOrEqual(startDate),
          ...(query.region ? { schoolId: query.region } : {}),
        },
        relations: ['school'],
        select: [
          'studentId',
          'gender',
          'dateOfBirth',
          'schoolId',
          'createdAt',
          'school',
        ] as any,
      }),

      this.schoolRepo.find({
        where: { isActive: true },
      }),
    ]);
    const filtered = allStudents.filter((s) => {
      if (query.state && s.school?.state !== query.state) return false;
      if (query.city && s.school?.city !== query.city) return false;
      return true;
    });
    const totalStudents = filtered.length;
    const totalSchools = new Set(filtered.map((s) => s.schoolId)).size;

    // ── Summary ──────────────────────────────────────────────────────────────
    const summary = {
      totalStudents,
      totalSchools,
      totalRegions: new Set(
        filtered.map((s) => s.school?.state).filter(Boolean),
      ).size,
      totalInitiatives: 0,
    };

    // ── Regions ──────────────────────────────────────────────────────────────
    const regions = this.buildRegions(filtered, allSchools);

    // ── Age bands ────────────────────────────────────────────────────────────
    const ageBands = this.buildAgeBands(filtered);

    // ── Gender ───────────────────────────────────────────────────────────────
    const gender = this.buildGender(filtered);

    // ── School types ─────────────────────────────────────────────────────────
    // School type stored on the School entity as `schoolType`; fall back to
    // class hierarchy_level heuristic if not available.
    const schoolTypes = this.buildSchoolTypes(filtered, allSchools);

    // ── Initiative reach ─────────────────────────────────────────────────────
    // Placeholder until Initiative entity exists — returns empty array
    const initiativeReach: InitiativeReachDto[] = [];

    // ── Growth trend (monthly enrolment) ─────────────────────────────────────
    const growthTrend = await this.buildGrowthTrend(
      organizationId,
      query.dateRange,
    );

    // ── Gender comparison by region (school) ─────────────────────────────────
    const demographicComparison = this.buildDemographicComparison(
      filtered,
      allSchools,
    );

    return {
      summary,
      regions,
      ageBands,
      gender,
      schoolTypes,
      initiativeReach,
      growthTrend,
      demographicComparison,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  // ── Private builders ───────────────────────────────────────────────────────

  private buildRegions(
    students: StudentProfile[],
    schools: School[],
  ): RegionDto[] {
    const bySchool = new Map<
      string,
      { name: string; count: number; state?: string; city?: string }
    >();

    for (const s of students) {
      const name = s.school?.name ?? s.schoolId;
      const entry = bySchool.get(s.schoolId) ?? {
        name,
        count: 0,
        state: s.school?.state ?? undefined,
        city: s.school?.city ?? undefined,
      };
      entry.count += 1;
      bySchool.set(s.schoolId, entry);
    }

    return Array.from(bySchool.entries()).map(
      ([id, { name, count, state, city }]) => ({
        id,
        name,
        state,
        city,
        studentCount: count,
        schoolCount: 1,
        initiativeCount: 0,
        density: densityTier(count),
      }),
    );
  }

  private buildAgeBands(students: StudentProfile[]): AgeBandDto[] {
    const counts = new Map<string, number>(AGE_BAND_ORDER.map((b) => [b, 0]));
    const today = new Date();

    for (const s of students) {
      if (!s.dateOfBirth) continue;
      const dob = new Date(s.dateOfBirth);
      const age = today.getFullYear() - dob.getFullYear();
      const band = ageBand(age);
      counts.set(band, (counts.get(band) ?? 0) + 1);
    }

    const studentsWithDob = students.filter((s) => s.dateOfBirth).length || 1;

    return AGE_BAND_ORDER.map((band) => {
      const count = counts.get(band) ?? 0;
      return {
        band,
        count,
        percentage: Math.round((count / studentsWithDob) * 100),
      };
    });
  }

  private buildGender(students: StudentProfile[]): GenderDto[] {
    const counts = new Map<string, number>([
      ['Male', 0],
      ['Female', 0],
      ['Not Specified', 0],
    ]);

    for (const s of students) {
      const g = s.gender?.toLowerCase();
      if (g === 'male' || g === 'm') {
        counts.set('Male', (counts.get('Male') ?? 0) + 1);
      } else if (g === 'female' || g === 'f') {
        counts.set('Female', (counts.get('Female') ?? 0) + 1);
      } else {
        counts.set('Not Specified', (counts.get('Not Specified') ?? 0) + 1);
      }
    }

    const total = students.length || 1;

    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  }

  private buildSchoolTypes(
    students: StudentProfile[],
    schools: School[],
  ): SchoolTypeDto[] {
    // Map schoolId → school record for fast lookup
    const schoolMap = new Map(schools.map((s) => [s.schoolId, s]));

    const counts = new Map<string, number>([
      ['Primary', 0],
      ['Secondary', 0],
      ['Non-formal', 0],
    ]);

    for (const s of students) {
      const school = schoolMap.get(s.schoolId);
      // Use school.schoolType if available, else 'Primary' as default
      const type: string = (school as any)?.schoolType ?? 'Primary';
      const normalised = type.toLowerCase().includes('secondary')
        ? 'Secondary'
        : type.toLowerCase().includes('non')
          ? 'Non-formal'
          : 'Primary';
      counts.set(normalised, (counts.get(normalised) ?? 0) + 1);
    }

    const total = students.length || 1;

    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  }

  private async buildGrowthTrend(
    organizationId: string,
    range: DemographicsDateRange = DemographicsDateRange.YEAR,
  ): Promise<GrowthTrendDto[]> {
    // Walk backwards month by month, count cumulative enrolled students
    const months =
      range === DemographicsDateRange.MONTH
        ? 1
        : range === DemographicsDateRange.QUARTER
          ? 3
          : range === DemographicsDateRange.ALL
            ? 24
            : 12;

    const now = new Date();
    const result: GrowthTrendDto[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const point = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(point.getFullYear(), point.getMonth() + 1, 0);

      const count = await this.studentRepo.count({
        where: {
          createdAt: Between(new Date(0), endOfMonth),
        },
      });

      result.push({ month: shortMonth(point), students: count });
    }

    return result;
  }

  private buildDemographicComparison(
    students: StudentProfile[],
    schools: School[],
  ): DemographicComparisonDto[] {
    const schoolMap = new Map(schools.map((s) => [s.schoolId, s.name]));

    // Group by school → count male/female
    const bySchool = new Map<
      string,
      { name: string; male: number; female: number; total: number }
    >();

    for (const s of students) {
      const name = schoolMap.get(s.schoolId) ?? s.schoolId;
      const entry = bySchool.get(s.schoolId) ?? {
        name,
        male: 0,
        female: 0,
        total: 0,
      };
      entry.total += 1;

      const g = s.gender?.toLowerCase();
      if (g === 'male' || g === 'm') entry.male += 1;
      else if (g === 'female' || g === 'f') entry.female += 1;

      bySchool.set(s.schoolId, entry);
    }

    return Array.from(bySchool.values()).map(
      ({ name, male, female, total }) => ({
        region: name,
        male: total > 0 ? Math.round((male / total) * 100) : 0,
        female: total > 0 ? Math.round((female / total) * 100) : 0,
      }),
    );
  }
}
