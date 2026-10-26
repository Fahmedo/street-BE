import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { Class } from '../school/entities/school-class.entity';
import { School } from '../school/entities/school.entity';

import { BulkPromoteDto } from 'src/promotions/dto/bulk-promote.dto';
import { PromoteStudentDto } from 'src/promotions/dto/promote-student.dto';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(OrganizationSchool)
private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Build a map of hierarchyLevel → Class for a given school
   * so we can quickly find the next class up
   */
  private buildLevelMap(classes: Class[]): Map<number, Class> {
    return new Map(classes.map((c) => [c.hierarchyLevel, c]));
  }

  private async getSchoolsForOrg(
    organizationId: string,
    schoolId?: string,
  ): Promise<School[]> {
    const where: any = { organizationId, isActive: true };
    if (schoolId) where.schoolId = schoolId;

    const schools = await this.schoolRepo.find({ where });
    if (schoolId && schools.length === 0) {
      throw new NotFoundException('School not found');
    }
    return schools;
  }

  private async getClassesForSchool(schoolId: string): Promise<Class[]> {
    return this.classRepo.find({
      where: { schoolId, isActive: true },
      order: { hierarchyLevel: 'ASC' },
    });
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────

  async previewPromotion(organizationId: string, schoolId?: string) {
    const schools = await this.getSchoolsForOrg(organizationId, schoolId);

    let toBePromoted = 0;
    let toBeGraduated = 0;
    let withNoNextClass = 0;
    const breakdown: {
      schoolName: string;
      promoted: number;
      graduated: number;
      noNextClass: number;
    }[] = [];

    for (const school of schools) {
      const classes = await this.getClassesForSchool(school.schoolId);
      const levelMap = this.buildLevelMap(classes);
      const classIds = classes.map((c) => c.classId);

      if (classIds.length === 0) continue;

      const students = await this.studentRepo
        .createQueryBuilder('s')
        .innerJoin('s.class', 'c')
        .where('s.school_id = :schoolId', { schoolId: school.schoolId })
        .andWhere('s.is_active = true')
        .andWhere('c.class_id IN (:...classIds)', { classIds })
        .getMany();

      let schoolPromoted = 0;
      let schoolGraduated = 0;
      let schoolNoNext = 0;

      for (const student of students) {
        const currentClass = classes.find((c) => c.classId === student.classId);
        if (!currentClass) continue;

        if (currentClass.isTerminal) {
          schoolGraduated++;
        } else {
          const nextClass = levelMap.get(currentClass.hierarchyLevel + 1);
          if (nextClass) {
            schoolPromoted++;
          } else {
            schoolNoNext++;
          }
        }
      }

      toBePromoted += schoolPromoted;
      toBeGraduated += schoolGraduated;
      withNoNextClass += schoolNoNext;

      breakdown.push({
        schoolName: school.name,
        promoted: schoolPromoted,
        graduated: schoolGraduated,
        noNextClass: schoolNoNext,
      });
    }

    return { toBePromoted, toBeGraduated, withNoNextClass, breakdown };
  }

  // ─── Bulk Promote ─────────────────────────────────────────────────────────────

  async bulkPromote(
    organizationId: string,
    promotedBy: string,
    dto: BulkPromoteDto,
  ) {
    const schools = await this.getSchoolsForOrg(organizationId, dto.schoolId);

    let totalPromoted = 0;
    let totalGraduated = 0;
    let totalSkipped = 0;
    const schoolNames: string[] = [];

    for (const school of schools) {
      const classes = await this.getClassesForSchool(school.schoolId);
      const levelMap = this.buildLevelMap(classes);
      const classIds = classes.map((c) => c.classId);

      if (classIds.length === 0) continue;

      const students = await this.studentRepo
        .createQueryBuilder('s')
        .where('s.school_id = :schoolId', { schoolId: school.schoolId })
        .andWhere('s.is_active = true')
        .andWhere('s.class_id IN (:...classIds)', { classIds })
        .getMany();

      if (students.length === 0) continue;

      const promotionRecords: Partial<Promotion>[] = [];
      const studentUpdates: { studentId: string; classId: string | null }[] = [];

      for (const student of students) {
        const currentClass = classes.find((c) => c.classId === student.classId);
        if (!currentClass) {
          totalSkipped++;
          continue;
        }

        if (currentClass.isTerminal) {
          // Graduate — remove from active class
          promotionRecords.push({
            organizationId,
            schoolId: school.schoolId,
            studentId: student.studentId,
            fromClassId: currentClass.classId,
            toClassId: undefined,
            academicYear: dto.academicYear,
            promotedBy,
            promotionType: 'bulk',
            notes: dto.notes,
          });
          studentUpdates.push({ studentId: student.studentId, classId: null });
          totalGraduated++;
        } else {
          const nextClass = levelMap.get(currentClass.hierarchyLevel + 1);
          if (!nextClass) {
            totalSkipped++;
            continue;
          }

          promotionRecords.push({
            organizationId,
            schoolId: school.schoolId,
            studentId: student.studentId,
            fromClassId: currentClass.classId,
            toClassId: nextClass.classId,
            academicYear: dto.academicYear,
            promotedBy,
            promotionType: 'bulk',
            notes: dto.notes,
          });
          studentUpdates.push({
            studentId: student.studentId,
            classId: nextClass.classId,
          });
          totalPromoted++;
        }
      }

      // Persist promotion records and student class updates in one go per school
      if (promotionRecords.length > 0) {
        await this.promotionRepo.save(
          this.promotionRepo.create(promotionRecords as any),
        );
      }

      for (const update of studentUpdates) {
        await this.studentRepo.update(
          { studentId: update.studentId },
          { classId: update.classId ?? undefined },
        );
      }

      schoolNames.push(school.name);
    }

    return {
      promoted: totalPromoted,
      graduated: totalGraduated,
      skipped: totalSkipped,
      schools: schoolNames,
    };
  }

  // ─── Promote Single Student ───────────────────────────────────────────────────

  async promoteStudent(
    organizationId: string,
    promotedBy: string,
    studentId: string,
    dto: PromoteStudentDto,
  ) {

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const student = await this.studentRepo.findOne({
      where: { schoolId: In(schoolIds), isActive: true },
      relations: ['class'],
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.class) throw new BadRequestException('Student has no current class assigned');

    const fromClass = student.class;

    // If toClassId provided, validate it belongs to same school
    if (dto.toClassId) {
      const toClass = await this.classRepo.findOne({
        where: { classId: dto.toClassId, schoolId: student.schoolId },
      });
      if (!toClass) {
        throw new NotFoundException('Target class not found in this school');
      }
      if (toClass.classId === fromClass.classId) {
        throw new BadRequestException('Student is already in this class');
      }
    }

    // Save promotion record
    const promotion = this.promotionRepo.create({
      organizationId,
      schoolId: student.schoolId,
      studentId: student.studentId,
      fromClassId: fromClass.classId,
      toClassId: dto.toClassId ?? undefined,
      academicYear: dto.academicYear,
      promotedBy,
      promotionType: 'individual',
      notes: dto.notes,
    });
    await this.promotionRepo.save(promotion);

    // Update student class
    await this.studentRepo.update(
      { studentId },
      { classId: dto.toClassId ?? undefined },
    );

    return {
      studentId,
      fromClass: fromClass.className,
      toClass: dto.toClassId
        ? (await this.classRepo.findOne({ where: { classId: dto.toClassId } }))?.className
        : 'Graduated',
      academicYear: dto.academicYear,
    };
  }

  // ─── History ─────────────────────────────────────────────────────────────────

  async getHistory(
    organizationId: string,
    filters: {
      schoolId?: string;
      studentId?: string;
      academicYear?: string;
      page: number;
      perPage: number;
    },
  ) {
    const { schoolId, studentId, academicYear, page, perPage } = filters;

    const qb = this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.student', 'student')
      .leftJoinAndSelect('p.fromClass', 'fromClass')
      .leftJoinAndSelect('p.toClass', 'toClass')
      .leftJoinAndSelect('p.school', 'school')
      .where('p.organization_id = :organizationId', { organizationId })
      .orderBy('p.promoted_at', 'DESC');

    if (schoolId) qb.andWhere('p.school_id = :schoolId', { schoolId });
    if (studentId) qb.andWhere('p.student_id = :studentId', { studentId });
    if (academicYear) qb.andWhere('p.academic_year = :academicYear', { academicYear });

    const [items, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      items: items.map((p) => ({
        promotionId: p.promotionId,
        studentName: `${p.student?.firstName} ${p.student?.lastName}`,
        studentCode: p.student?.studentId,
        school: p.school?.name,
        fromClass: p.fromClass?.className,
        toClass: p.toClass?.className ?? 'Graduated',
        academicYear: p.academicYear,
        promotionType: p.promotionType,
        notes: p.notes,
        promotedAt: p.promotedAt,
      })),
      meta: {
        currentPage: page,
        itemsPerPage: perPage,
        totalItems: total,
        totalPages: Math.ceil(total / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page * perPage < total,
      },
    };
  }
}