import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, Not } from 'typeorm';
import { RewardProgramme } from './entities/reward-programme.entity';
import { RewardIssuance } from './entities/reward-issuance.entity';
import { RewardProgrammeSchool } from './entities/reward-programme-school.entity';
import { School } from '../school/entities/school.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';
import {
  CreateProgrammeDto,
  ProgrammeStatus,
} from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { CreateIssuanceDto } from './dto/create-issuance.dto';
import { UpdateIssuanceDto } from './dto/update-issuance.dto';
import { RewardSettings } from './entities/reward-settings.entity';
import { QueryProgrammesDto, QueryIssuancesDto } from './dto/query-rewards.dto';
import {
  RewardsDashboardDto,
  ProgrammeSummaryDto,
  IssuanceSummaryDto,
  EligibleSchoolDto,
  EligibleFamilyDto,
} from './dto/rewards-response.dto';
import { formatPaginatedResponse } from '../common/pagination/pagination.helper';
import { AttendanceStatus } from '../common/enum/attendance.enums';
import {
  SettingsResponseDto,
  UpdateSettingsDto,
} from './dto/reward-settings.dto';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';




@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardProgramme)
    private readonly programmeRepo: Repository<RewardProgramme>,

    @InjectRepository(RewardIssuance)
    private readonly issuanceRepo: Repository<RewardIssuance>,

    @InjectRepository(RewardProgrammeSchool)
    private readonly programmeSchoolRepo: Repository<RewardProgrammeSchool>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(RewardSettings)
    private readonly settingsRepo: Repository<RewardSettings>,

    @InjectRepository(OrganizationSchool)
private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboard(organizationId: string): Promise<RewardsDashboardDto> {
    const [activeProgrammes, totalIssued, recentIssuances] = await Promise.all([
      this.programmeRepo.find({
        where: { organizationId, status: ProgrammeStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      }),
      this.issuanceRepo.count({
        where: { organizationId },
      }),
      this.issuanceRepo.find({
        where: { organizationId },
        relations: ['programme', 'school', 'student'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    // Eligible counts — calculated across all active programmes
    const eligibleSchools = await this.countEligibleSchools(
      organizationId,
      activeProgrammes,
    );
    const eligibleFamilies = await this.countEligibleFamilies(
      organizationId,
      activeProgrammes,
    );

    // Attendance improvement — avg change across issued records that have snapshots
    const issuancesWithChange = await this.issuanceRepo
      .createQueryBuilder('i')
      .select('AVG(i.attendance_change_snapshot)', 'avgAttChange')
      .addSelect('AVG(i.performance_score_snapshot)', 'avgPerfChange')
      .where('i.organization_id = :organizationId', { organizationId })
      .andWhere('i.attendance_change_snapshot IS NOT NULL')
      .getRawOne<{ avgAttChange: string; avgPerfChange: string }>();

    // Completion rate = issued / (issued + pending)
    const [issuedCount, pendingCount] = await Promise.all([
      this.issuanceRepo.count({
        where: { organizationId, status: 'issued' as any },
      }),
      this.issuanceRepo.count({
        where: { organizationId, status: 'pending' as any },
      }),
    ]);
    const completionRate =
      issuedCount + pendingCount > 0
        ? Math.round((issuedCount / (issuedCount + pendingCount)) * 100)
        : 0;

    // Formatted active programmes with counts
    const programmeSummaries = await Promise.all(
      activeProgrammes.map((p) => this.formatProgramme(p, organizationId)),
    );

    return {
      stats: {
        activeProgrammes: activeProgrammes.length,
        eligibleSchools,
        eligibleFamilies,
        rewardsIssued: totalIssued,
        attendanceImprovement: Number(
          Number(issuancesWithChange?.avgAttChange ?? 0).toFixed(1),
        ),
        performanceImprovement: Number(
          Number(issuancesWithChange?.avgPerfChange ?? 0).toFixed(1),
        ),
        totalValueDistributed: 'N/A', // wire when financial tracking is added
        rewardCompletionRate: completionRate,
      },
      activeProgrammes: programmeSummaries,
      recentIssuances: recentIssuances.map((i) => this.formatIssuance(i)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRAMMES — CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async createProgramme(organizationId: string, dto: CreateProgrammeDto) {
    const settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });


    const programme = this.programmeRepo.create({
      organizationId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      period: dto.period,
      attendanceThreshold: dto.attendanceThreshold,
      performanceThreshold: dto.performanceThreshold,
      improvementBased: dto.improvementBased,
      minimumDataDays: dto.minimumDataDays ?? settings?.minimumDataDays ?? 30,
      rewardType: dto.rewardType,
      rewardValue: dto.rewardValue,
      rewardDescription: dto.rewardDescription,
      distributionMethod: dto.distributionMethod,
      eligibilityScope: dto.eligibilityScope,
      budgetCap: dto.budgetCap,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.activateImmediately
        ? ProgrammeStatus.ACTIVE
        : ProgrammeStatus.DRAFT,
    });

    await this.programmeRepo.save(programme);

    // If selected scope, wire specific schools
    if (dto.eligibilityScope === 'selected' && dto.schoolIds?.length) {
      const links = dto.schoolIds.map((schoolId) =>
        this.programmeSchoolRepo.create({
          programmeId: programme.programmeId,
          schoolId,
        }),
      );
      await this.programmeSchoolRepo.save(links);
    }

    return { message: 'Reward programme created successfully' };
  }

  async getProgrammes(organizationId: string, query: QueryProgrammesDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const qb = this.programmeRepo
      .createQueryBuilder('p')
      .where('p.organization_id = :organizationId', { organizationId });

    if (query.status)
      qb.andWhere('p.status = :status', { status: query.status });
    if (query.type)
      qb.andWhere('p.programme_type = :type', { type: query.type });
    if (query.searchTerm)
      qb.andWhere('p.name ILIKE :search', { search: `%${query.searchTerm}%` });

    const [programmes, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    const items = await Promise.all(
      programmes.map((p) => this.formatProgramme(p, organizationId)),
    );

    return formatPaginatedResponse(items, page, perPage, total);
  }

  async getProgrammeById(organizationId: string, programmeId: string) {
    const programme = await this.programmeRepo.findOne({
      where: { programmeId, organizationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    const [summary, schoolLinks] = await Promise.all([
      this.formatProgramme(programme, organizationId),
      programme.eligibilityScope === 'selected'
        ? this.programmeSchoolRepo.find({
            where: { programmeId },
            relations: ['school'],
          })
        : Promise.resolve([]),
    ]);

    return {
      ...summary,
      selectedSchools: schoolLinks.map((l) => ({
        schoolId: l.schoolId,
        name: (l as any).school?.name ?? l.schoolId,
      })),
    };
  }

  async updateProgramme(
    organizationId: string,
    programmeId: string,
    dto: UpdateProgrammeDto,
  ) {
    const programme = await this.programmeRepo.findOne({
      where: { programmeId, organizationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    const updated = this.programmeRepo.merge(programme, dto);
    await this.programmeRepo.save(updated);

    // Re-sync school links if provided
    if (dto.schoolIds !== undefined) {
      await this.programmeSchoolRepo.delete({ programmeId });
      if (dto.schoolIds.length) {
        const links = dto.schoolIds.map((schoolId) =>
          this.programmeSchoolRepo.create({ programmeId, schoolId }),
        );
        await this.programmeSchoolRepo.save(links);
      }
    }

    return { message: 'Programme updated successfully' };
  }

  // ─── SETTINGS ────────────────────────────────────────────────────────────
  async getSettings(organizationId: string): Promise<SettingsResponseDto> {
    let settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = this.settingsRepo.create({ organizationId });
      await this.settingsRepo.save(settings);
    }

    return {
      settingsId: settings.settingsId,
      organizationId: settings.organizationId,
      maxRewardsPerPeriod: settings.maxRewardsPerPeriod,
      budgetCap: settings.budgetCap,
      approvalWorkflow: settings.approvalWorkflow,
      minimumDataDays: settings.minimumDataDays,
      auditTrailEnabled: settings.auditTrailEnabled,
      noRetroactiveChanges: settings.noRetroactiveChanges,
      conflictWarningsEnabled: settings.conflictWarningsEnabled,
      notifyNewEligible: settings.notifyNewEligible,
      weeklySummary: settings.weeklySummary,
      budgetAlerts: settings.budgetAlerts,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  async updateSettings(
    organizationId: string,
    dto: UpdateSettingsDto,
  ): Promise<{ message: string }> {
    let settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.settingsRepo.create({ organizationId, ...dto });
    } else {
      settings = this.settingsRepo.merge(settings, dto);
    }

    await this.settingsRepo.save(settings);
    return { message: 'Settings updated successfully' };
  }

  async deleteProgramme(organizationId: string, programmeId: string) {
    const programme = await this.programmeRepo.findOne({
      where: { programmeId, organizationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    await this.programmeRepo.remove(programme);
    return { message: 'Programme deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ELIGIBILITY
  // ─────────────────────────────────────────────────────────────────────────

  // Add this private helper to the service:
  private async hasEnoughData(
    entityId: string,
    type: 'school' | 'student',
    minimumDays: number,
  ): Promise<boolean> {
    const field = type === 'school' ? 'school_id' : 'student_id';
    const raw = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT DATE(a.created_at))', 'days')
      .where(`a.${field} = :id`, { id: entityId })
      .getRawOne<{ days: string }>();
    return Number(raw?.days ?? 0) >= minimumDays;
  }
  async getEligibleSchools(
    organizationId: string,
    programmeId?: string,
  ): Promise<EligibleSchoolDto[]> {
    const programmes = await this.programmeRepo.find({
      where: {
        organizationId,
        status: ProgrammeStatus.ACTIVE,
        type: 'school' as any,
        ...(programmeId ? { programmeId } : {}),
      },
    });

    if (!programmes.length) return [];
const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const schools = await this.schoolRepo.find({
      where: { schoolId: In(schoolIds), isActive: true },
    });

    const settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });
    const results: EligibleSchoolDto[] = [];

    for (const school of schools) {
      for (const programme of programmes) {
        const minDays =
          settings?.minimumDataDays ?? programme.minimumDataDays ?? 30;
        const hasData = await this.hasEnoughData(
          school.schoolId,
          'school',
          minDays,
        );

        if (!hasData) {
          results.push({
            schoolId: school.schoolId,
            schoolName: school.name,
            attendanceRate: 0,
            attendanceChange: 0,
            performanceScore: 0,
            eligibilityStatus: 'pending',
            rewardType: programme.rewardValue ?? programme.rewardType,
            programmeId: programme.programmeId,
          });
          continue;
        }

        const rate = await this.getSchoolAttendanceRate(school.schoolId);
        const change = await this.getSchoolAttendanceChange(school.schoolId);
        const perf = await this.getSchoolPerformanceScore(school.schoolId);

        results.push({
          schoolId: school.schoolId,
          schoolName: school.name,
          attendanceRate: rate,
          attendanceChange: change,
          performanceScore: perf,
          eligibilityStatus: this.checkSchoolEligibility(
            programme,
            rate,
            change,
            perf,
          ),
          rewardType: programme.rewardValue ?? programme.rewardType,
          programmeId: programme.programmeId,
        });
      }
    }

    return results;
  }

  async getEligibleFamilies(
    organizationId: string,
    programmeId?: string,
  ): Promise<EligibleFamilyDto[]> {
    const programmes = await this.programmeRepo.find({
      where: {
        organizationId,
        status: ProgrammeStatus.ACTIVE,
        type: 'family' as any,
        ...(programmeId ? { programmeId } : {}),
      },
    });

    if (!programmes.length) return [];

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const students = await this.studentRepo.find({
      where: { schoolId: In(schoolIds), isActive: true },
      relations: ['school'],
      take: 200,
    });

    const settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });
    const results: EligibleFamilyDto[] = [];

    for (const student of students) {
      for (const programme of programmes) {
        const minDays =
          settings?.minimumDataDays ?? programme.minimumDataDays ?? 30;
        const hasData = await this.hasEnoughData(
          student.studentId,
          'student',
          minDays,
        );

        if (!hasData) {
          results.push({
            studentId: student.studentId,
            studentName: `${student.firstName} ${student.lastName.charAt(0)}.`,
            schoolName: student.school?.name ?? '',
            schoolId: student.school?.schoolId ?? '',
            guardianMasked: this.maskGuardian(student),
            attendanceRate: 0,
            attendanceChange: 0,
            performanceStatus: 'Insufficient Data',
            eligibilityStatus: 'pending',
            rewardType: programme.rewardValue ?? programme.rewardType,
            programmeId: programme.programmeId,
          });
          continue;
        }

        const rate = await this.getStudentAttendanceRate(student.studentId);
        const change = await this.getStudentAttendanceChange(student.studentId);

        results.push({
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName.charAt(0)}.`,
          schoolId: student.school?.schoolId ?? '',
          schoolName: student.school?.name ?? '',
          guardianMasked: this.maskGuardian(student),
          attendanceRate: rate,
          attendanceChange: change,
          performanceStatus:
            change >= 10 ? 'Excellent' : change >= 5 ? 'Improving' : 'Stable',
          eligibilityStatus: this.checkFamilyEligibility(
            programme,
            rate,
            change,
          ),
          rewardType: programme.rewardValue ?? programme.rewardType,
          programmeId: programme.programmeId,
        });
      }
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ISSUANCES — CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async createIssuance(organizationId: string, dto: CreateIssuanceDto) {
    const programme = await this.programmeRepo.findOne({
      where: { programmeId: dto.programmeId, organizationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    if (programme.type === 'school' && !dto.schoolId)
      throw new BadRequestException(
        'schoolId is required for school programmes',
      );
    if (programme.type === 'family' && !dto.studentId)
      throw new BadRequestException(
        'studentId is required for family programmes',
      );


const existingIssuance = await this.issuanceRepo.findOne({
    where: {
      organizationId,
      programmeId:   dto.programmeId,
      ...(dto.schoolId  ? { schoolId:  dto.schoolId  } : {}),
      ...(dto.studentId ? { studentId: dto.studentId } : {}),
      ...(dto.periodLabel ? { periodLabel: dto.periodLabel } : {}),
      status: Not('cancelled' as any),
    },
  });

  if (existingIssuance) {
    throw new BadRequestException(
      `A reward has already been issued to this ${programme.type === 'school' ? 'school' : 'family'} ` +
      `for this programme${dto.periodLabel ? ` in period "${dto.periodLabel}"` : ''}. ` +
      `Cancel the existing issuance first to re-issue.`,
    );
  }

    const settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });

    if (settings) {
      // Check max rewards per period
      const currentPeriodCount = await this.issuanceRepo.count({
        where: {
          organizationId,
          programmeId: dto.programmeId,
          status: Not('cancelled' as any),
        },
      });
      if (currentPeriodCount >= settings.maxRewardsPerPeriod) {
        throw new BadRequestException(
          `Maximum rewards per period (${settings.maxRewardsPerPeriod}) reached for this programme`,
        );
      }

      // Check org-level budget cap if set
      if (settings.budgetCap) {
        const activeProgrammesCount = await this.issuanceRepo.count({
          where: { organizationId, status: Not('cancelled' as any) },
        });
        if (activeProgrammesCount >= settings.budgetCap) {
          throw new BadRequestException(
            'Organisation budget cap has been reached. Update settings to proceed.',
          );
        }
      }
    }

    const issuance = this.issuanceRepo.create({
      organizationId,
      programmeId: dto.programmeId,
      recipientType: dto.recipientType,
      schoolId: dto.schoolId,
      studentId: dto.studentId,
      attendanceRateSnapshot: dto.attendanceRateSnapshot,
      attendanceChangeSnapshot: dto.attendanceChangeSnapshot,
      performanceScoreSnapshot: dto.performanceScoreSnapshot,
      periodLabel: dto.periodLabel,
      valueLabel: dto.valueLabel ?? programme.rewardValue,
      status:
        programme.distributionMethod === 'automatic'
          ? ('approved' as any)
          : ('pending' as any),
    });

    await this.issuanceRepo.save(issuance);
    return { message: 'Issuance created successfully' };
  }

  async getIssuances(organizationId: string, query: QueryIssuancesDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const qb = this.issuanceRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.programme', 'programme')
      .leftJoinAndSelect('i.school', 'school')
      .leftJoinAndSelect('i.student', 'student')
      .where('i.organization_id = :organizationId', { organizationId });

    if (query.programmeId)
      qb.andWhere('i.programme_id = :pid', { pid: query.programmeId });
    if (query.status)
      qb.andWhere('i.status = :status', { status: query.status });
    if (query.recipientType)
      qb.andWhere('i.recipient_type = :rt', { rt: query.recipientType });
    if (query.schoolId)
      qb.andWhere('i.school_id = :schoolId', { schoolId: query.schoolId });
    if (query.studentId)
      qb.andWhere('i.student_id = :studentId', { studentId: query.studentId });
    if (query.periodLabel)
      qb.andWhere('i.period_label = :period', { period: query.periodLabel });

    // ✅ FIX: Use the table alias 'i' instead of 'i.created_at'
    qb.orderBy('i.createdAt', 'DESC');

    const [issuances, total] = await qb
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    return formatPaginatedResponse(
      issuances.map((i) => this.formatIssuance(i)),
      page,
      perPage,
      total,
    );
  }

  async updateIssuance(
    organizationId: string,
    issuanceId: string,
    dto: UpdateIssuanceDto,
  ) {
    const issuance = await this.issuanceRepo.findOne({
      where: { issuanceId, organizationId },
    });
    if (!issuance) throw new NotFoundException('Issuance not found');

    const updated = this.issuanceRepo.merge(issuance, {
      ...dto,
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : issuance.issuedAt,
    });

    await this.issuanceRepo.save(updated);
    return { message: 'Issuance updated successfully' };
  }

  async approveIssuance(
    organizationId: string,
    issuanceId: string,
    approvedBy: string,
  ) {
    const issuance = await this.issuanceRepo.findOne({
      where: { issuanceId, organizationId },
    });
    if (!issuance) throw new NotFoundException('Issuance not found');
    if (issuance.status !== 'pending')
      throw new BadRequestException('Only pending issuances can be approved');

    const settings = await this.settingsRepo.findOne({
      where: { organizationId },
    });
    if (settings?.approvalWorkflow === 'automatic') {
      throw new BadRequestException(
        'This organisation uses automatic approval. Manual approval is disabled.',
      );
    }
    issuance.status = 'approved' as any;
    issuance.approvedBy = approvedBy;
    issuance.issuedAt = new Date();

    await this.issuanceRepo.save(issuance);
    return { message: 'Issuance approved' };
  }

  async cancelIssuance(organizationId: string, issuanceId: string) {
    const issuance = await this.issuanceRepo.findOne({
      where: { issuanceId, organizationId },
    });
    if (!issuance) throw new NotFoundException('Issuance not found');
    if (issuance.status === 'issued')
      throw new BadRequestException('Issued rewards cannot be cancelled');

    issuance.status = 'cancelled' as any;
    await this.issuanceRepo.save(issuance);
    return { message: 'Issuance cancelled' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async formatProgramme(
    programme: RewardProgramme,
    organizationId: string,
  ): Promise<ProgrammeSummaryDto> {
    const [eligibleCount, issuedCount] = await Promise.all([
      programme.type === 'school'
        ? this.countEligibleForProgramme(programme, organizationId)
        : this.countEligibleFamiliesForProgramme(programme, organizationId),
      this.issuanceRepo.count({
        where: { programmeId: programme.programmeId },
      }),
    ]);

    return {
      programmeId: programme.programmeId,
      name: programme.name,
      description: programme.description,
      type: programme.type,
      status: programme.status,
      period: programme.period,
      attendanceThreshold: programme.attendanceThreshold,
      performanceThreshold: programme.performanceThreshold,
      improvementBased: programme.improvementBased,
      rewardType: programme.rewardType,
      rewardValue: programme.rewardValue,
      eligibilityScope: programme.eligibilityScope,
      distributionMethod: programme.distributionMethod,
      budgetCap: programme.budgetCap,
      startDate: programme.startDate,
      endDate: programme.endDate,
      eligibleCount,
      issuedCount,
      createdAt: programme.createdAt.toISOString(),
    };
  }

  private formatIssuance(issuance: RewardIssuance): IssuanceSummaryDto {
    const recipientName =
      issuance.recipientType === 'school'
        ? ((issuance as any).school?.name ??
          issuance.schoolId ??
          'Unknown School')
        : (issuance as any).student
          ? `${(issuance as any).student.firstName} ${(issuance as any).student.lastName.charAt(0)}.`
          : (issuance.studentId ?? 'Unknown Student');

    return {
      issuanceId: issuance.issuanceId,
      programmeId: issuance.programmeId,
      programmeName: (issuance as any).programme?.name ?? '',
      rewardType: (issuance as any).programme?.rewardType ?? '',
      recipientType: issuance.recipientType,
      recipientName,
      schoolId: issuance.schoolId,
      studentId: issuance.studentId,
      status: issuance.status,
      attendanceRateSnapshot: issuance.attendanceRateSnapshot,
      attendanceChangeSnapshot: issuance.attendanceChangeSnapshot,
      performanceScoreSnapshot: issuance.performanceScoreSnapshot,
      periodLabel: issuance.periodLabel,
      valueLabel: issuance.valueLabel,
      outcomeChange: issuance.outcomeChange,
      approvedBy: issuance.approvedBy,
      issuedAt: issuance.issuedAt?.toISOString(),
      createdAt: issuance.createdAt.toISOString(),
    };
  }

  private async getSchoolAttendanceRate(schoolId: string): Promise<number> {
    const raw = await this.attendanceRepo
      .createQueryBuilder('a')
      .select(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
        'rate',
      )
      .where('a.school_id = :schoolId', { schoolId })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne<{ rate: string }>();
    return Number(Number(raw?.rate ?? 0).toFixed(1));
  }

  private async getSchoolAttendanceChange(schoolId: string): Promise<number> {
    // Compare last 30 days vs previous 30 days
    const now = new Date();
    const d30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const d60 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);

    const [current, previous] = await Promise.all([
      this.attendanceRepo
        .createQueryBuilder('a')
        .select(
          `SUM(CASE WHEN a.status = :p THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) * 100`,
          'rate',
        )
        .where('a.school_id = :schoolId AND a.created_at >= :d30', {
          schoolId,
          d30,
        })
        .setParameter('p', AttendanceStatus.PRESENT)
        .getRawOne<{ rate: string }>(),
      this.attendanceRepo
        .createQueryBuilder('a')
        .select(
          `SUM(CASE WHEN a.status = :p THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) * 100`,
          'rate',
        )
        .where(
          'a.school_id = :schoolId AND a.created_at >= :d60 AND a.created_at < :d30',
          { schoolId, d60, d30 },
        )
        .setParameter('p', AttendanceStatus.PRESENT)
        .getRawOne<{ rate: string }>(),
    ]);

    return Number(
      (Number(current?.rate ?? 0) - Number(previous?.rate ?? 0)).toFixed(1),
    );
  }

  private async getSchoolPerformanceScore(schoolId: string): Promise<number> {
    // Proxy: attendance rate as performance score until dedicated scores exist
    return this.getSchoolAttendanceRate(schoolId);
  }

  private async getStudentAttendanceRate(studentId: string): Promise<number> {
    const raw = await this.attendanceRepo
      .createQueryBuilder('a')
      .select(
        `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100`,
        'rate',
      )
      .where('a.student_id = :studentId', { studentId })
      .setParameter('present', AttendanceStatus.PRESENT)
      .getRawOne<{ rate: string }>();
    return Number(Number(raw?.rate ?? 0).toFixed(1));
  }

  private async getStudentAttendanceChange(studentId: string): Promise<number> {
    const now = new Date();
    const d30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const d60 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);

    const [current, previous] = await Promise.all([
      this.attendanceRepo
        .createQueryBuilder('a')
        .select(
          `SUM(CASE WHEN a.status = :p THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) * 100`,
          'rate',
        )
        .where('a.student_id = :studentId AND a.created_at >= :d30', {
          studentId,
          d30,
        })
        .setParameter('p', AttendanceStatus.PRESENT)
        .getRawOne<{ rate: string }>(),
      this.attendanceRepo
        .createQueryBuilder('a')
        .select(
          `SUM(CASE WHEN a.status = :p THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) * 100`,
          'rate',
        )
        .where(
          'a.student_id = :studentId AND a.created_at >= :d60 AND a.created_at < :d30',
          { studentId, d60, d30 },
        )
        .setParameter('p', AttendanceStatus.PRESENT)
        .getRawOne<{ rate: string }>(),
    ]);

    return Number(
      (Number(current?.rate ?? 0) - Number(previous?.rate ?? 0)).toFixed(1),
    );
  }

  private checkSchoolEligibility(
    programme: RewardProgramme,
    rate: number,
    change: number,
    perf: number,
  ): 'eligible' | 'pending' | 'not-eligible' {
    if (programme.improvementBased) {
      const threshold = programme.attendanceThreshold ?? 10;
      if (change >= threshold) return 'eligible';
      if (change >= threshold * 0.8) return 'pending';
      return 'not-eligible';
    }

    const meetsAttendance =
      !programme.attendanceThreshold || rate >= programme.attendanceThreshold;
    const meetsPerformance =
      !programme.performanceThreshold || perf >= programme.performanceThreshold;

    if (meetsAttendance && meetsPerformance) return 'eligible';
    if (rate >= (programme.attendanceThreshold ?? 0) * 0.95) return 'pending';
    return 'not-eligible';
  }

  private checkFamilyEligibility(
    programme: RewardProgramme,
    rate: number,
    change: number,
  ): 'eligible' | 'pending' | 'not-eligible' {
    if (programme.improvementBased) {
      const threshold = programme.attendanceThreshold ?? 10;
      if (change >= threshold) return 'eligible';
      if (change >= threshold * 0.8) return 'pending';
      return 'not-eligible';
    }

    if (!programme.attendanceThreshold || rate >= programme.attendanceThreshold)
      return 'eligible';
    if (rate >= programme.attendanceThreshold * 0.95) return 'pending';
    return 'not-eligible';
  }

  private maskGuardian(student: StudentProfile): string {
    // Mask guardian name — first initial + masked surname
    const name: string = (student as any).guardianName ??  (student as any).guardianContact ?? '';
    if (!name) return '— —';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return `${parts[0].charAt(0)}.****`;
    return `${parts[0].charAt(0)}. ${parts[1].charAt(0)}****`;
  }

  private async countEligibleSchools(
    organizationId: string,
    programmes: RewardProgramme[],
  ): Promise<number> {
    const schoolProgrammes = programmes.filter((p) => p.type === 'school');
    if (!schoolProgrammes.length) return 0;

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const schools = await this.schoolRepo.find({
     where: { schoolId: In(schoolIds), isActive: true },
    });
    let count = 0;
    for (const school of schools) {
      const rate = await this.getSchoolAttendanceRate(school.schoolId);
      const change = await this.getSchoolAttendanceChange(school.schoolId);
      const perf = await this.getSchoolPerformanceScore(school.schoolId);
      const isEligible = schoolProgrammes.some(
        (p) =>
          this.checkSchoolEligibility(p, rate, change, perf) === 'eligible',
      );
      if (isEligible) count++;
    }
    return count;
  }

  private async countEligibleFamilies(
    organizationId: string,
    programmes: RewardProgramme[],
  ): Promise<number> {
    const familyProgrammes = programmes.filter((p) => p.type === 'family');
    if (!familyProgrammes.length) return 0;

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const students = await this.studentRepo.find({
      where: { schoolId: In(schoolIds), isActive: true },
      take: 500,
    });
    let count = 0;
    for (const student of students) {
      const rate = await this.getStudentAttendanceRate(student.studentId);
      const change = await this.getStudentAttendanceChange(student.studentId);
      const isEligible = familyProgrammes.some(
        (p) => this.checkFamilyEligibility(p, rate, change) === 'eligible',
      );
      if (isEligible) count++;
    }
    return count;
  }

  private async countEligibleForProgramme(
    programme: RewardProgramme,
    organizationId: string,
  ): Promise<number> {

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);

    const schools = await this.schoolRepo.find({
      where: { schoolId: In(schoolIds), isActive: true },
    });
    let count = 0;
    for (const school of schools) {
      const rate = await this.getSchoolAttendanceRate(school.schoolId);
      const change = await this.getSchoolAttendanceChange(school.schoolId);
      const perf = await this.getSchoolPerformanceScore(school.schoolId);
      if (
        this.checkSchoolEligibility(programme, rate, change, perf) ===
        'eligible'
      )
        count++;
    }
    return count;
  }

  private async countEligibleFamiliesForProgramme(
    programme: RewardProgramme,
    organizationId: string,
  ): Promise<number> {

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const students = await this.studentRepo.find({
      where: { schoolId: In(schoolIds), isActive: true },
      take: 500,
    });
    let count = 0;
    for (const student of students) {
      const rate = await this.getStudentAttendanceRate(student.studentId);
      const change = await this.getStudentAttendanceChange(student.studentId);
      if (this.checkFamilyEligibility(programme, rate, change) === 'eligible')
        count++;
    }
    return count;
  }
}
