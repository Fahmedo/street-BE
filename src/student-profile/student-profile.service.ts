import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { StudentProfile } from './entities/student-profile.entity';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { School } from 'src/school/entities/school.entity';
import { AttendanceStatus } from 'src/common/enum/attendance.enums';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { StudentQueryDto } from './dto/student-query.dto';
import { Brackets, MoreThanOrEqual } from 'typeorm';
import { SchoolCalendar } from 'src/school-calendar/entities/school-calendar.entity';
import { OrganizationStudent } from './entities/organization_students.entity';
import {
  MentorAssignment,
  AssignmentScope,
} from 'src/mentor/entities/mentor-assignment.entity'; // ✅ Add this
import { Class } from 'src/school/entities/school-class.entity'; // ✅ Add this
import { PaginatedResponse } from 'src/common/pagination/interfaces/paginated-response-interface';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepository: Repository<StudentAttendanceRecord>,

    @InjectRepository(SchoolCalendar)
    private readonly calendarRepository: Repository<SchoolCalendar>,

    @InjectRepository(OrganizationStudent)
    private readonly orgStudentRepo: Repository<OrganizationStudent>,

    @InjectRepository(MentorAssignment) // ✅ Add this
    private readonly mentorAssignmentRepo: Repository<MentorAssignment>,

    @InjectRepository(OrganizationSchool)
private readonly orgSchoolRepo: Repository<OrganizationSchool>,

    private readonly dataSource: DataSource, // ✅ Add this for transactions
  ) {}

  /**
   * ✅ Generate unique student code
   * Format: SCH-{SCHOOL_CODE_PART}-S-{SEQUENTIAL}
   * Example: SCH-TESTF-S-0001
   */
async generateStudentCode(schoolId: string): Promise<string> {
  const school = await this.schoolRepo.findOne({
    where: { schoolId },
    select: ['code', 'name'],
  });

  if (!school) throw new NotFoundException('School not found');

  const schoolCodePart = school.code
    ? school.code.split('-').slice(1, 2).join('').substring(0, 5)
    : school.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();

  // Retry up to 5 times in case of collision
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const studentCode = `SCH-${schoolCodePart}-${suffix}`;

    const exists = await this.studentRepo.findOne({ where: { studentCode } });
    if (!exists) return studentCode;
  }

  throw new Error('Could not generate unique student code. Please try again.');
}

async create(
  dto: CreateStudentProfileDto,
  userId: string,
  organizationId: string,
): Promise<StudentProfile> {
  // 1. Check duplicate national ID
  if (dto.nationalId) {
    const existing = await this.studentRepo.findOne({
      where: { nationalId: dto.nationalId },
    });
    if (existing) {
      return await this.addExistingStudentToOrg(
        existing.studentId,
        organizationId,
        dto.enrollmentDate || new Date(),
      );
    }
  }

  // 2. Parallel validation
  const [hasSchoolAccess, classExists] = await Promise.all([
    this.orgSchoolRepo.findOne({
      where: { organizationId, schoolId: dto.schoolId, isActive: true },
    }),
    this.classRepo.findOne({
      where: { classId: dto.classId, schoolId: dto.schoolId, isActive: true },
    }),
  ]);

  if (!hasSchoolAccess) {
    throw new ForbiddenException('This school is not accessible by your organization');
  }
  if (!classExists) {
    throw new NotFoundException('Class not found in this school');
  }

  // 3. Generate student code
  const studentCode = await this.generateStudentCode(dto.schoolId);

  // 4. Normalize gender
  const gender = dto.gender
    ? dto.gender.charAt(0).toUpperCase() + dto.gender.slice(1).toLowerCase()
    : dto.gender;

  // 5. Save student + org-student link in transaction
  return await this.dataSource.transaction(async (manager) => {
    const student = manager.create(StudentProfile, {
      ...dto,
      gender,
      studentCode,
      registeredByOrgId: organizationId,
      registeredByUserId: userId,
      isActive: true,
    });

    const savedStudent = await manager.save(StudentProfile, student);

    await manager.save(OrganizationStudent, {
      organizationId,
      studentId: savedStudent.studentId,
      enrollmentDate: dto.enrollmentDate || new Date(),
      status: 'active',
      riskLevel: (dto as any).riskLevel ?? null,
      orgSpecificNotes: (dto as any).orgSpecificNotes ?? null,
      isActive: true,
    } as any);

    return savedStudent;
  });
}

  async findAll(
    organizationId: string,
    query: PaginationQueryDto & {
      schoolId?: string;
      classId?: string;
      gender?: string;
      enrollmentStatus?: string;
      sortBy?: string;
      sortOrder?: string;
    },
  ) {
    const {
      page = 1,
      perPage = 10,
      searchTerm = '',
      schoolId,
      classId,
      gender,
      enrollmentStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.studentRepo
      .createQueryBuilder('student')
      .innerJoin('student.organizationStudents', 'orgStudent')
      .leftJoinAndSelect('student.school', 'school')
      .leftJoinAndSelect('student.class', 'class')
      .where('orgStudent.organization_id = :organizationId', { organizationId })
      .andWhere('orgStudent.is_active = true')
      .andWhere('student.is_active = true');

    // Apply filters
    if (schoolId) qb.andWhere('student.school_id = :schoolId', { schoolId });
    if (classId) qb.andWhere('student.class_id = :classId', { classId });
    if (gender) qb.andWhere('student.gender ILIKE :gender', { gender });
    if (enrollmentStatus !== undefined && enrollmentStatus !== '') {
      qb.andWhere('student.is_active = :enrollmentStatus', {
        enrollmentStatus: enrollmentStatus === 'true',
      });
    }
    if (searchTerm) {
      qb.andWhere(
        '(student.first_name ILIKE :q OR student.last_name ILIKE :q OR student.student_code ILIKE :q)',
        { q: `%${searchTerm}%` },
      );
    }

   const sortColumn =
  {
    createdAt: 'student.createdAt',    // camelCase, not snake_case
    firstName: 'student.firstName',
    lastName: 'student.lastName',
  }[sortBy] ?? 'student.createdAt';

    qb.orderBy(sortColumn, sortOrder as 'ASC' | 'DESC');


    const [items, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    // ✅ Return formatted response inline
    return {
      message: 'Students retrieved successfully',
      items: items.map((s) => ({
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        studentCode: s.studentCode,
        guardianContact: s.guardianPhone,
        isActive: s.isActive,
        schoolId: s.schoolId,
        schoolName: s.school?.name,
        classId: s.classId,
        className: s.class?.className,
        createdAt: s.createdAt,
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
  async findOne(organizationId: string, id: string) {
    const student = await this.studentRepo.findOne({
      where: { studentId: id },
      relations: ['school', 'class', 'organizationStudents'],
    });

    if (!student) throw new NotFoundException('Student not found');

    // ✅ Verify this org has access to this student
    const hasAccess = student.organizationStudents.some(
      (os) => os.organizationId === organizationId && os.isActive,
    );

    if (!hasAccess) {
      throw new NotFoundException('Student not found in your organization');
    }

    return { message: 'Success', data: student };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateStudentProfileDto,
  ) {
    const student = await this.studentRepo.findOne({
      where: { studentId: id },
      relations: ['organizationStudents'],
    });

    if (!student) throw new NotFoundException('Student not found');

    // ✅ Verify this org has access
    const hasAccess = student.organizationStudents.some(
      (os) => os.organizationId === organizationId && os.isActive,
    );

    if (!hasAccess) {
      throw new NotFoundException('Student not found in your organization');
    }

    Object.assign(student, dto);
    await this.studentRepo.save(student);
    return { message: 'Student updated successfully' };
  }

  async remove(organizationId: string, id: string) {
  // 1. Find the student
  const student = await this.studentRepo.findOne({
    where: { studentId: id },
  });

  if (!student) throw new NotFoundException('Student not found');

  // 2. Check this org has access
  const orgStudent = await this.orgStudentRepo.findOne({
    where: { organizationId, studentId: id },
  });

  if (!orgStudent) {
    throw new NotFoundException('Student not found in your organization');
  }

  // 3. Count how many other orgs are actively using this student
  const otherOrgCount = await this.orgStudentRepo.count({
    where: {
      studentId: id,
      isActive: true,
    },
  });

  const isRegisteringOrg = student.registeredByOrgId === organizationId;
  const isSharedWithOthers = otherOrgCount > 1; // >1 means other orgs besides this one

  // 4. Decision
  if (isSharedWithOthers) {
    // Other orgs are using this student — always soft delete regardless of who created
    orgStudent.isActive = false;
    orgStudent.status = 'withdrawn' as any;
    await this.orgStudentRepo.save(orgStudent);

    return {
      message: 'Student withdrawn from your organization. Record preserved as other organizations are using it.',
      action: 'soft_delete',
    };
  }

  if (isRegisteringOrg) {
    // Only this org uses the student AND this org created them → hard delete
    await this.studentRepo.remove(student); // cascades to org_students

    return {
      message: 'Student record permanently deleted.',
      action: 'hard_delete',
    };
  }


  orgStudent.isActive = false;
  orgStudent.status = 'withdrawn' as any;
  await this.orgStudentRepo.save(orgStudent);

  return {
    message: 'Student withdrawn from your organization.',
    action: 'soft_delete',
  };
}


async findAllGlobal(query: PaginationQueryDto & {
  schoolId?: string;
  classId?: string;
  gender?: string;
  organizationId?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const {
    page = 1,
    perPage = 20,
    searchTerm = '',
    schoolId,
    classId,
    gender,
    organizationId,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = query;

  const qb = this.studentRepo
    .createQueryBuilder('student')
    .leftJoinAndSelect('student.school', 'school')
    .leftJoinAndSelect('student.class', 'class')
    .leftJoinAndSelect('student.organizationStudents', 'orgStudent');

  if (schoolId) qb.andWhere('student.school_id = :schoolId', { schoolId });
  if (classId) qb.andWhere('student.class_id = :classId', { classId });
  if (gender) qb.andWhere('student.gender ILIKE :gender', { gender });
  if (isActive !== undefined && isActive !== '') {
    qb.andWhere('student.is_active = :isActive', {
      isActive: isActive === 'true',
    });
  }
  if (organizationId) {
    qb.andWhere('orgStudent.organization_id = :organizationId', { organizationId })
      .andWhere('orgStudent.is_active = true');
  }
  if (searchTerm) {
    qb.andWhere(
      '(student.first_name ILIKE :q OR student.last_name ILIKE :q OR student.student_code ILIKE :q OR student.national_id ILIKE :q)',
      { q: `%${searchTerm}%` },
    );
  }

  const sortColumn = {
    createdAt: 'student.createdAt',
    firstName: 'student.firstName',
    lastName: 'student.lastName',
  }[sortBy] ?? 'student.createdAt';

  qb.orderBy(sortColumn, sortOrder as 'ASC' | 'DESC');

  const [items, total] = await qb
    .skip((page - 1) * perPage)
    .take(perPage)
    .getManyAndCount();

  return {
    message: 'Students retrieved successfully',
    items: items.map((s) => ({
      studentId: s.studentId,
      studentCode: s.studentCode,
      firstName: s.firstName,
      middleName: s.middleName,
      lastName: s.lastName,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      nationalId: s.nationalId,
      phoneNumber: s.phoneNumber,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      homeAddress: s.homeAddress,
      photoUrl: s.photoUrl,
      isActive: s.isActive,
      schoolId: s.schoolId,
      schoolName: s.school?.name,
      classId: s.classId,
      className: s.class?.className,
      registeredByOrgId: s.registeredByOrgId,
      organizationCount: s.organizationStudents?.filter(os => os.isActive).length ?? 0,
      createdAt: s.createdAt,
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

async getSchoolsByOrganization(organizationId: string, perPage = 100) {
  const orgSchools = await this.orgSchoolRepo.find({
    where: { organizationId, isActive: true },
    select: ['schoolId'],
  });

  const schoolIds = orgSchools.map((os) => os.schoolId);

  if (!schoolIds.length) return { schools: [] };

  const schools = await this.schoolRepo.find({
    where: { schoolId: In(schoolIds), isActive: true },
    select: ['schoolId', 'name', 'code'],
    take: perPage,
    order: { name: 'ASC' },
  });

  return {
    schools: schools.map((s) => ({
      schoolId: s.schoolId,
      schoolName: s.name,
      code: s.code,
    })),
  };
}
async getStudentOrgSummary() {
  const raw = await this.orgStudentRepo
  .createQueryBuilder('os')
  .select('os.organizationId', 'organizationId')
  .addSelect('COUNT(os.studentId)', 'totalStudents')
  .addSelect('SUM(CASE WHEN os.isActive = true THEN 1 ELSE 0 END)', 'activeStudents')
  .addSelect("SUM(CASE WHEN os.riskLevel = 'high' THEN 1 ELSE 0 END)", 'highRisk')
  .addSelect("SUM(CASE WHEN os.riskLevel = 'medium' THEN 1 ELSE 0 END)", 'mediumRisk')
  .addSelect("SUM(CASE WHEN os.riskLevel = 'low' THEN 1 ELSE 0 END)", 'lowRisk')
  .leftJoin('os.organization', 'org')
  .addSelect('org.organizationName', 'organizationName')
  .addSelect('org.shortCode', 'shortCode')
  .addSelect('org.status', 'orgStatus')
  .where('os.isActive = true')
  .groupBy('os.organizationId')
  .addGroupBy('org.organizationName')
  .addGroupBy('org.shortCode')
  .addGroupBy('org.status')
  .orderBy('COUNT(os.studentId)', 'DESC')
  .getRawMany();

  return {
    message: 'Organization student summary retrieved',
    items: raw.map((r) => ({
      organizationId: r.organizationId,
      organizationName: r.organizationName ?? 'Unknown',
      shortCode: r.shortCode ?? '',
      orgStatus: r.orgStatus,
      totalStudents: Number(r.totalStudents),
      activeStudents: Number(r.activeStudents),
      highRisk: Number(r.highRisk),
      mediumRisk: Number(r.mediumRisk),
      lowRisk: Number(r.lowRisk),
    })),
    total: raw.length,
  };
}
async hardDeleteGlobal(studentId: string) {
  const student = await this.studentRepo.findOne({ where: { studentId } });
  if (!student) throw new NotFoundException('Student not found');
  await this.studentRepo.remove(student);
  return { message: 'Student permanently deleted from global registry' };
}

  // ✅ FIXED: Get students assigned to a mentor
  async getMyStudents(
    mentorId: string,
    organizationId: string,
    query: StudentQueryDto,
  ) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    // ✅ Get student IDs assigned to this mentor
    const assignments = await this.mentorAssignmentRepo.find({
      where: {
        mentorId,
        organizationId,
        scope: AssignmentScope.STUDENT,
        isActive: true,
      },
      select: ['studentId'],
    });

    const studentIds = assignments.map((a) => a.studentId).filter(Boolean);

    if (studentIds.length === 0) {
      return {
        message: 'No students assigned to this mentor',
        stats: { total: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0 },
        items: [],
        meta: {
          currentPage: page,
          itemsPerPage: perPage,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    }

    const qb = this.studentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.school', 'school')
      .leftJoinAndSelect('s.class', 'class')
      .innerJoin('s.organizationStudents', 'os')
      .where('s.student_id IN (:...studentIds)', { studentIds })
      .andWhere('os.organization_id = :organizationId', { organizationId })
      .andWhere('os.is_active = true');

    if (query.searchTerm) {
      const search = `%${query.searchTerm.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(s.first_name) LIKE :search', { search })
            .orWhere('LOWER(s.last_name) LIKE :search', { search })
            .orWhere('LOWER(school.name) LIKE :search', { search });
        }),
      );
    }

    if (query.riskLevel) {
      qb.andWhere('os.risk_level = :riskLevel', { riskLevel: query.riskLevel });
    }

    if (query.schoolId) {
      qb.andWhere('s.school_id = :schoolId', { schoolId: query.schoolId });
    }

    const [students, totalItems] = await qb
      .orderBy('s.created_at', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    // ✅ Get risk level stats from OrganizationStudent
    const [total, lowRisk, mediumRisk, highRisk] = await Promise.all([
      this.orgStudentRepo.count({
  where: { organizationId, isActive: true },
}),
      this.orgStudentRepo.count({
        where: { organizationId, riskLevel: 'low', isActive: true },
      }),
      this.orgStudentRepo.count({
        where: { organizationId, riskLevel: 'medium', isActive: true },
      }),
      this.orgStudentRepo.count({
        where: { organizationId, riskLevel: 'high', isActive: true },
      }),
    ]);

    const items = await Promise.all(
      students.map(async (s) => {
        const attendanceRate = await this.calculateAttendanceRate(s.studentId);

        // Get org-specific data
        const orgStudent = await this.orgStudentRepo.findOne({
          where: {
            studentId: s.studentId,
            organizationId,
          },
        });

        return {
          id: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          school: s.school?.name ?? '',
          schoolId: s.schoolId,
          class: s.class?.className ?? 'N/A',
          attendanceRate,
          attendanceStatus: this.getAttendanceStatus(attendanceRate),
          performanceStatus: null,
          riskLevel: orgStudent?.riskLevel ?? null, // ✅ From org-student table
        };
      }),
    );

    return {
      message: 'Students retrieved successfully',
      stats: { total: studentIds.length, lowRisk, mediumRisk, highRisk },
      items,
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
  async getStudentById(
    studentId: string,
    organizationId: string,
  ): Promise<StudentProfile> {
    // Verify org has access to this student
    const orgStudent = await this.orgStudentRepo.findOne({
      where: {
        studentId,
        organizationId,
        isActive: true,
      },
    });

    if (!orgStudent) {
      throw new ForbiddenException('You do not have access to this student');
    }

    const student = await this.studentRepo.findOne({
      where: { studentId },
      relations: ['school', 'class', 'organizationStudents'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getStudentDetail(studentId: string) {
    const student = await this.studentRepo.findOne({
      where: { studentId },
      relations: ['school', 'class'],
    });

    if (!student) throw new NotFoundException('Student not found');

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const attendanceRecords = await this.attendanceRepository.find({
      where: {
        studentId,
        attendanceDate: MoreThanOrEqual(
          fourWeeksAgo.toISOString().split('T')[0],
        ),
      },
      order: { attendanceDate: 'ASC' },
    });

    const weeklyTrend = this.computeWeeklyTrend(attendanceRecords);

    const totalRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const attendanceRate =
      totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    const recentAbsences = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.ABSENT,
    ).length;

    return {
      id: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      school: student.school?.name ?? '',
      schoolId: student.schoolId,
      class: student.class?.className ?? '',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      guardianContact: student.guardianPhone,
      mentorName: null,
      riskLevel: null,
      performanceStatus: null,
      attendanceRate,
      recentAbsences,
      weeklyTrend,
      enrollmentStatus: student.isActive,
    };
  }

  private computeWeeklyTrend(records: StudentAttendanceRecord[]) {
    const weeks: Record<string, { present: number; total: number }> = {};

    records.forEach((r) => {
      const date = new Date(r.attendanceDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = `W${Math.ceil((new Date().getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;

      if (!weeks[weekKey]) weeks[weekKey] = { present: 0, total: 0 };
      weeks[weekKey].total++;
      if (r.status === AttendanceStatus.PRESENT) weeks[weekKey].present++;
    });

    return Object.entries(weeks)
      .map(([week, data]) => ({
        week,
        rate:
          data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }))
      .slice(-4);
  }

  private async calculateAttendanceRate(studentId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalDays, presentDays] = await Promise.all([
        this.attendanceRepository.count({
          where: {
            studentId,
            attendanceDate: MoreThanOrEqual(
              thirtyDaysAgo.toISOString().split('T')[0],
            ),
          },
        }),
        this.attendanceRepository.count({
          where: {
            studentId,
            status: AttendanceStatus.PRESENT,
            attendanceDate: MoreThanOrEqual(
              thirtyDaysAgo.toISOString().split('T')[0],
            ),
          },
        }),
      ]);

      return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    } catch (error) {
      console.error('Error calculating attendance rate:', error);
      return 0;
    }
  }

  private getAttendanceStatus(
    rate: number,
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (rate >= 90) return 'excellent';
    if (rate >= 75) return 'good';
    if (rate >= 60) return 'fair';
    return 'poor';
  }

  // Helper method for adding existing student to org
  private async addExistingStudentToOrg(
    studentId: string,
    organizationId: string,
    enrollmentDate: Date,
  ): Promise<StudentProfile> {
    // Check if already linked
    const existing = await this.orgStudentRepo.findOne({
      where: { studentId, organizationId },
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate
        existing.isActive = true;
        existing.enrollmentDate = enrollmentDate;
        await this.orgStudentRepo.save(existing);
      }
      throw new ConflictException(
        'Student already enrolled in your organization',
      );
    }

    // Create new link
    const orgStudent = this.orgStudentRepo.create({
  organizationId,
  studentId,
  enrollmentDate,
  status: 'active',
  isActive: true,
} as any);

    await this.orgStudentRepo.save(orgStudent);
  const student = await this.studentRepo.findOne({
  where: { studentId },
});
if (!student) throw new NotFoundException('Student not found');
return student;
  }
}
