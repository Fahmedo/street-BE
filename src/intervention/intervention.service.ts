// src/intervention/intervention.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Intervention } from './entities/intervention.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { InterventionQueryDto } from './dto/intervention-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { InterventionStatus } from 'src/common/enum/intervention.enum';

@Injectable()
export class InterventionService {
  constructor(
    @InjectRepository(Intervention)
    private readonly interventionRepo: Repository<Intervention>,
    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,
    private readonly auditService: AuditLogService,
    @InjectRepository(SchoolCalendar)
    private readonly calendarRepo: Repository<SchoolCalendar>,
  ) {}

  async create(dto: CreateInterventionDto, currentUser: AuthenticatedUser) {
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const student = await this.studentRepo.findOne({
      where: {
        studentId: dto.studentId,
        registeredByOrgId: currentUser.organizationId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const intervention = this.interventionRepo.create({
      ...dto,
      mentorId: currentUser.userId,
      organizationId: currentUser.organizationId,
      schoolId: student.schoolId,
      createdBy: currentUser.userId,
    });

    // ✅ Auto-link calendar
    if (dto.calendarId) {
      const calendar = await this.calendarRepo.findOne({
        where: { calendarId: dto.calendarId },
      });
      if (calendar) {
        intervention.calendarId = calendar.calendarId;
        intervention.academicYear = calendar.academicYear;
        intervention.termName = calendar.termName;
      }
    } else {
      // Auto-detect current term for the student's school
      const currentTerm = await this.calendarRepo.findOne({
        where: {
          schoolId: student.schoolId,
          orgId: currentUser.organizationId,
          isCurrent: true,
        },
      });
      if (currentTerm) {
        intervention.calendarId = currentTerm.calendarId;
        intervention.academicYear = currentTerm.academicYear;
        intervention.termName = currentTerm.termName;
      }
    }

    await this.interventionRepo.save(intervention);

    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId,
      action: AuditAction.INTERVENTION_CREATED,
      entity: 'intervention',
      entityId: intervention.id,
      details: `Logged ${dto.type} intervention for ${student.firstName} ${student.lastName}`,
      metadata: {
        interventionId: intervention.id,
        studentId: dto.studentId,
        type: dto.type,
        academicYear: intervention.academicYear,
        termName: intervention.termName,
      },
    });

    return {
      message: 'Intervention created successfully',
      intervention: await this.findOne(intervention.id, currentUser),
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const intervention = await this.interventionRepo.findOne({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
      relations: ['student', 'mentor', 'school', 'calendar'], 
    });

    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }

    return this.formatIntervention(intervention);
  }

    async findAll(query: InterventionQueryDto, currentUser: AuthenticatedUser) {
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    const qb = this.interventionRepo
      .createQueryBuilder('intervention')
      .leftJoinAndSelect('intervention.student', 'student')
      .leftJoinAndSelect('intervention.mentor', 'mentor')
      .leftJoinAndSelect('intervention.school', 'school')
      .where('intervention.organizationId = :organizationId', {
        organizationId: currentUser.organizationId,
      });

    // Apply filters
    if (query.type) {
      qb.andWhere('intervention.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('intervention.status = :status', { status: query.status });
    }

    if (query.studentId) {
      qb.andWhere('intervention.studentId = :studentId', {
        studentId: query.studentId,
      });
    }

    if (query.mentorId) {
      qb.andWhere('intervention.mentorId = :mentorId', {
        mentorId: query.mentorId,
      });
    }

    if (query.dateFrom && query.dateTo) {
      qb.andWhere('intervention.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    } else if (query.dateFrom) {
      qb.andWhere('intervention.date >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    } else if (query.dateTo) {
      qb.andWhere('intervention.date <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    if (query.searchTerm) {
      qb.andWhere(
        '(LOWER(student.firstName) LIKE :search OR LOWER(student.lastName) LIKE :search OR LOWER(intervention.notes) LIKE :search)',
        { search: `%${query.searchTerm.toLowerCase()}%` },
      );
    }

    const [interventions, totalItems] = await qb
      .orderBy('intervention.date', 'DESC')
      .addOrderBy('intervention.createdAt', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    return {
      message: 'Success',
     items: interventions.map((i) => this.formatIntervention(i)),
      meta: {
        currentPage: page,
        itemsPerPage: perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(totalItems / perPage),
      },
    };
  }

  async update(
    id: string,
    dto: UpdateInterventionDto,
    currentUser: AuthenticatedUser,
  ) {
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const intervention = await this.interventionRepo.findOne({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
      relations: ['student'],
    });

    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }

    // Check if user is the creator or admin
    if (
      intervention.mentorId !== currentUser.userId &&
      !currentUser.roles?.includes('organization-admin' as any)
    ) {
      throw new ForbiddenException('You can only edit your own interventions');
    }

    // Update intervention
    Object.assign(intervention, dto);
    await this.interventionRepo.save(intervention);

    // Log audit
    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId,
      action: AuditAction.INTERVENTION_UPDATED,
      entity: 'intervention',
      entityId: intervention.id,
      details: `Updated intervention for ${intervention.student.firstName} ${intervention.student.lastName}`,
      metadata: { interventionId: intervention.id, changes: dto },
    });

    return {
      message: 'Intervention updated successfully',
      intervention: await this.findOne(id, currentUser),
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const intervention = await this.interventionRepo.findOne({
      where: {
        id,
        organizationId: currentUser.organizationId,
      },
      relations: ['student'],
    });

    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }

    // Check if user is the creator or admin
    if (
      intervention.mentorId !== currentUser.userId &&
      !currentUser.roles?.includes('organization-admin' as any)
    ) {
      throw new ForbiddenException(
        'You can only delete your own interventions',
      );
    }

    await this.interventionRepo.remove(intervention);

    // Log audit
    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId,
      action: AuditAction.INTERVENTION_DELETED,
      entity: 'intervention',
      entityId: id,
      details: `Deleted intervention for ${intervention.student.firstName} ${intervention.student.lastName}`,
      metadata: { interventionId: id, type: intervention.type },
    });

    return {
      message: 'Intervention deleted successfully',
    };
  }

  async getStatistics(currentUser: AuthenticatedUser) {
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const where: any = { organizationId: currentUser.organizationId };

    if (!currentUser.roles?.includes('organization-admin' as any)) {
      where.mentorId = currentUser.userId;
    }

    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      scheduled,
      completed,
      cancelled,
      phoneCalls,
      homeVisits,
      meetings,
      other,
    ] = await Promise.all([
      this.interventionRepo.count({ where }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.OPEN },
      }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.IN_PROGRESS },
      }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.RESOLVED },
      }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.CLOSED },
      }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.SCHEDULED },
      }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.COMPLETED },
      }),
      this.interventionRepo.count({
        where: { ...where, status: InterventionStatus.CANCELLED },
      }),
      this.interventionRepo.count({ where: { ...where, type: 'phone-call' } }),
      this.interventionRepo.count({ where: { ...where, type: 'home-visit' } }),
      this.interventionRepo.count({ where: { ...where, type: 'meeting' } }),
      this.interventionRepo.count({ where: { ...where, type: 'other' } }),
    ]);

    return {
      message: 'Success',
      stats: {
        total,
        byStatus: {
          open,
          inProgress,
          resolved,
          closed,
          scheduled,
          completed,
          cancelled,
        },
        byType: { phoneCalls, homeVisits, meetings, other },
      },
    };
  }

  private formatIntervention(intervention: Intervention) {
    return {
      id: intervention.id,
      studentId: intervention.studentId,
      mentorId: intervention.mentorId,
      schoolId: intervention.schoolId,
      // ✅ calendar fields
      calendarId: intervention.calendarId,
      academicYear: intervention.academicYear,
      termName: intervention.termName,
      calendar: intervention.calendar
        ? {
            calendarId: intervention.calendar.calendarId,
            academicYear: intervention.calendar.academicYear,
            termName: intervention.calendar.termName,
            termOrder: intervention.calendar.termOrder,
            startDate: intervention.calendar.startDate,
            endDate: intervention.calendar.endDate,
          }
        : null,
      type: intervention.type,
      category: intervention.category,
      priority: intervention.priority,
      status: intervention.status,
      date: intervention.date,
      description: intervention.description,
      actionTaken: intervention.actionTaken,
      notes: intervention.notes,
      outcome: intervention.outcome,
      followUpRequired: intervention.followUpRequired,
      followUpDate: intervention.followUpDate,
      createdBy: intervention.createdBy,
      createdAt: intervention.createdAt,
      updatedAt: intervention.updatedAt,
      student: intervention.student
        ? {
            studentId: intervention.student.studentId,
            firstName: intervention.student.firstName,
            lastName: intervention.student.lastName,
            studentCode: intervention.student.studentId,
          }
        : null,
      mentor: intervention.mentor
        ? {
            id: intervention.mentor.id,
            firstName: intervention.mentor.firstName,
            lastName: intervention.mentor.lastName,
            email: intervention.mentor.email,
          }
        : null,
      school: intervention.school
        ? {
            schoolId: intervention.school.schoolId,
            name: intervention.school.name,
          }
        : null,
    };
  }

  async getHistoryAndOutcomes(
    mentorId: string,
    organizationId: string,
    query: {
      page?: number;
      perPage?: number;
      type?: string;
      month?: string;
      schoolId?: string; // Add this to filter by school
    },
  ) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    // ── Completed interventions list ──────────────────────────────────
    const qb = this.interventionRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.student', 'student')
      .where('i.mentorId = :mentorId', { mentorId })
      .andWhere('i.organizationId = :organizationId', { organizationId })
      .andWhere('i.status = :status', { status: InterventionStatus.COMPLETED });

    if (query.type) {
      qb.andWhere('i.type = :type', { type: query.type });
    }

    if (query.month) {
      // e.g. "2024-01"
      qb.andWhere("TO_CHAR(i.date::date, 'YYYY-MM') = :month", {
        month: query.month,
      });
    }

    const [interventions, totalItems] = await qb
      .orderBy('i.date', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    // ── Monthly chart data (last 4 months) ───────────────────────────
    const chartData = await this.interventionRepo
      .createQueryBuilder('i')
      .select("TO_CHAR(i.date::date, 'Mon')", 'month')
      .addSelect(
        "COUNT(CASE WHEN i.status = 'completed' THEN 1 END)::int",
        'completed',
      )
      .addSelect(
        "COUNT(CASE WHEN i.status = 'scheduled' THEN 1 END)::int",
        'scheduled',
      )
      .addSelect(
        "COUNT(CASE WHEN i.status = 'cancelled' THEN 1 END)::int",
        'cancelled',
      )
      .where('i.mentorId = :mentorId', { mentorId })
      .andWhere('i.organizationId = :organizationId', { organizationId })
      .andWhere("i.date::date >= NOW() - INTERVAL '4 months'")
      .groupBy("TO_CHAR(i.date::date, 'Mon')")
      .orderBy('MIN(i.date::date)', 'ASC')
      .getRawMany();

    // ✅ REPLACE: Get active calendar instead of session
    // Get schoolId to fetch the right calendar
    // If mentor works across multiple schools, get the first one or pass schoolId in query
    let activeCalendar: SchoolCalendar | null = null;

    if (query.schoolId) {
      // If schoolId is provided, use it
      activeCalendar = await this.calendarRepo.findOne({
        where: {
          schoolId: query.schoolId,
          orgId: organizationId,
          isCurrent: true,
        },
      });
    } else {
      // Otherwise, get the mentor's primary school from their first intervention
      const sampleIntervention = await this.interventionRepo.findOne({
        where: { mentorId, organizationId },
        select: ['schoolId'],
      });

      if (sampleIntervention?.schoolId) {
        activeCalendar = await this.calendarRepo.findOne({
          where: {
            schoolId: sampleIntervention.schoolId,
            orgId: organizationId,
            isCurrent: true,
          },
        });
      }
    }

    // ── Term stats (active calendar) ───────────────────────────────────
    const termQb = this.interventionRepo
      .createQueryBuilder('i')
      .where('i.mentorId = :mentorId', { mentorId })
      .andWhere('i.organizationId = :organizationId', { organizationId });

    // ✅ CHANGED: Use calendar dates instead of session dates
    if (activeCalendar) {
      termQb.andWhere('i.date BETWEEN :start AND :end', {
        start: activeCalendar.startDate,
        end: activeCalendar.endDate,
      });
    }

    const [termTotal, termCompleted] = await Promise.all([
      termQb.getCount(),
      termQb
        .clone()
        .andWhere('i.status = :s', { s: InterventionStatus.COMPLETED })
        .getCount(),
    ]);

    // Distinct students helped this term
    const studentsHelped = await termQb
      .clone()
      .andWhere('i.status = :s', { s: InterventionStatus.COMPLETED })
      .select('COUNT(DISTINCT i.studentId)::int', 'count')
      .getRawOne();

    const successRate =
      termTotal > 0 ? Math.round((termCompleted / termTotal) * 100) : 0;

    // ── Summary stats ─────────────────────────────────────────────────
    const allTimeTotal = await this.interventionRepo.count({
      where: { mentorId, organizationId },
    });
    const allTimeCompleted = await this.interventionRepo.count({
      where: { mentorId, organizationId, status: InterventionStatus.COMPLETED },
    });

    return {
      message: 'History and outcomes retrieved successfully',
      stats: {
        totalCompleted: allTimeCompleted,
        successRate:
          allTimeTotal > 0
            ? Math.round((allTimeCompleted / allTimeTotal) * 100)
            : 0,
      },
      chartData: chartData.map((d) => ({
        month: d.month,
        completed: d.completed,
        scheduled: d.scheduled,
        cancelled: d.cancelled,
      })),
      // ✅ CHANGED: Return calendar info instead of session info
      termSummary: {
        termName: activeCalendar?.termName ?? null,
        academicYear: activeCalendar?.academicYear ?? null,
        startDate: activeCalendar?.startDate ?? null,
        endDate: activeCalendar?.endDate ?? null,
        studentsHelped: studentsHelped?.count ?? 0,
        completedInterventions: termCompleted,
        successRate,
      },
      items: interventions.map((i) => ({
        id: i.id,
        studentId: i.studentId,
        studentName: i.student
          ? `${i.student.firstName} ${i.student.lastName}`.trim()
          : 'Unknown',
        type: i.type,
        status: i.status,
        date: i.date,
        followUpDate: i.followUpDate,
        notes: i.notes,
        outcome: i.outcome,
      })),
      meta: {
        currentPage: page,
        itemsPerPage: perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(totalItems / perPage),
      },
    };
  }
}
