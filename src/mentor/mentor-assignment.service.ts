// src/mentor/mentor-assignment.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets, Between } from 'typeorm';
import {
  MentorAssignment,
  AssignmentScope,
} from './entities/mentor-assignment.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { School } from '../school/entities/school.entity';
import { Class } from '../school/entities/school-class.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { Role } from 'src/common/enum/roles.enum';
import { OrganizationStatus } from 'src/common/enum/organization-status';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { AttendanceStatus } from 'src/common/enum/attendance.enums';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import {
  AttendanceRecordDto,
  StudentDetailResponse,
} from 'src/student-profile/types/student-detail-response';
import { StudentDetailQueryDto } from 'src/student-profile/dto/student-detail-query.dto';

@Injectable()
export class MentorAssignmentService {
  constructor(
    @InjectRepository(MentorAssignment)
    private readonly assignmentRepo: Repository<MentorAssignment>,
    @InjectRepository(OrganizationUser)
    private readonly userRepo: Repository<OrganizationUser>,
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,
    @InjectRepository(SchoolCalendar) // ✅ Changed from Session to SchoolCalendar
    private readonly calendarRepository: Repository<SchoolCalendar>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,
    private readonly auditService: AuditLogService,
  ) {}

  async getMentors(query: PaginationQueryDto, currentUser: AuthenticatedUser) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    // Add organizationId validation
    if (!currentUser.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const organizationId = currentUser.organizationId;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.organizationId = :organizationId', {
        organizationId,
      })
      .andWhere(
        `(user.roles = :exact OR user.roles LIKE :start OR user.roles LIKE :middle OR user.roles LIKE :end)`,
        {
          exact: Role.MENTOR,
          start: `${Role.MENTOR},%`,
          middle: `%,${Role.MENTOR},%`,
          end: `%,${Role.MENTOR}`,
        },
      );

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.searchTerm) {
      const search = `%${query.searchTerm.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(user.firstName) LIKE :search', { search })
            .orWhere('LOWER(user.lastName) LIKE :search', { search })
            .orWhere('LOWER(user.email) LIKE :search', { search });
        }),
      );
    }

    const [users, totalItems] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    // Get all active assignments for these mentors with relations
    const mentorIds = users.map((u) => u.id);
    const assignments = await this.assignmentRepo.find({
      where: {
        mentorId: In(mentorIds),
        organizationId, // Now using the validated variable
        isActive: true,
      },
      relations: ['school', 'class', 'student'],
    });

    // Group assignments by mentor ID
    const assignmentsByMentor = assignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.mentorId]) {
          acc[assignment.mentorId] = [];
        }
        acc[assignment.mentorId].push(assignment);
        return acc;
      },
      {} as Record<string, MentorAssignment[]>,
    );

    // Calculate student counts for each mentor
    const studentCountsByMentor: Record<string, number> = {};

    for (const mentorId of mentorIds) {
      const mentorAssignments = assignmentsByMentor[mentorId] || [];
      const studentIds = new Set<string>();

      for (const assignment of mentorAssignments) {
        switch (assignment.scope) {
          case AssignmentScope.SCHOOL:
            // Get all students in the school
            const schoolStudents = await this.studentRepo.find({
             where: { schoolId: assignment.schoolId, isActive: true },

              select: ['studentId'],
            });
            schoolStudents.forEach((s) => studentIds.add(s.studentId));
            break;

          case AssignmentScope.CLASS:
            // Get all students in the class
            const classStudents = await this.studentRepo.find({
             where: { classId: assignment.classId, isActive: true },
              select: ['studentId'],
            });
            classStudents.forEach((s) => studentIds.add(s.studentId));
            break;

          case AssignmentScope.STUDENT:
            // Direct student assignment
            if (assignment.studentId) {
              studentIds.add(assignment.studentId);
            }
            break;
        }
      }

      studentCountsByMentor[mentorId] = studentIds.size;
    }

    // Stats scoped to mentors only
    const statsQb = () =>
      this.userRepo
        .createQueryBuilder('user')
        .where('user.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere(
          `(user.roles = :exact OR user.roles LIKE :start OR user.roles LIKE :middle OR user.roles LIKE :end)`,
          {
            exact: Role.MENTOR,
            start: `${Role.MENTOR},%`,
            middle: `%,${Role.MENTOR},%`,
            end: `%,${Role.MENTOR}`,
          },
        );

    const [total, active, pending, suspended] = await Promise.all([
      statsQb().getCount(),
      statsQb()
        .andWhere('user.status = :status', {
          status: OrganizationStatus.ACTIVE,
        })
        .getCount(),
      statsQb()
        .andWhere('user.status = :status', {
          status: OrganizationStatus.PENDING,
        })
        .getCount(),
      statsQb()
        .andWhere('user.status = :status', {
          status: OrganizationStatus.SUSPENDED,
        })
        .getCount(),
    ]);

    return {
      message: 'Success',
      stats: { total, active, pending, suspended },
      items: users.map((user) =>
        this.formatMentorWithAssignments(
          user,
          assignmentsByMentor[user.id] || [],
          studentCountsByMentor[user.id] || 0,
        ),
      ),
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

  // Add this new helper method
  private formatMentorWithAssignments(
    user: OrganizationUser,
    assignments: MentorAssignment[],
    studentCount: number,
  ) {
    // Extract unique school names from assignments
    const assignedSchools = [
      ...new Set(
        assignments.filter((a) => a.school?.name).map((a) => a.school!.name),
      ),
    ];

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      roles: user.roles,
      status: user.status,
      organizationId: user.organizationId,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
      assignedSchools, // Array of school names
      assignedStudentsCount: studentCount, // Total computed student count
      assignments: assignments.map((a) => ({
        id: a.id,
        scope: a.scope,
        schoolId: a.schoolId,
        schoolName: a.school?.name,
        classId: a.classId,
        className: a.class?.className,
        studentId: a.studentId,
        studentName: a.student
          ? `${a.student.firstName} ${a.student.lastName}`
          : null,
        assignedAt: a.assignedAt,
        assignedBy: a.assignedBy,
        notes: a.notes,
      })),
    };
  }

  private formatMentor = (user: OrganizationUser) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    roles: user.roles,
    status: user.status,
    organizationId: user.organizationId,
    schoolId: user.schoolId,
    createdAt: user.createdAt,
  });

  // ─── ASSIGN MENTOR TO ENTIRE SCHOOL ──────────────────────────────────────
  async assignMentorToSchool(
    mentorId: string,
    schoolId: string,
    currentUser: AuthenticatedUser,
  ) {
    const mentor = await this.validateMentor(
      mentorId,
      currentUser.organizationId!,
    );
    const school = await this.validateSchool(
      schoolId,
      currentUser.organizationId!,
    );

    // Check if already assigned
    const existing = await this.assignmentRepo.findOne({
      where: {
        mentorId,
        schoolId,
        scope: AssignmentScope.SCHOOL,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Mentor is already assigned to this school',
      );
    }

    const assignment = this.assignmentRepo.create({
      mentorId,
      organizationId: currentUser.organizationId!,
      scope: AssignmentScope.SCHOOL,
      schoolId,
      assignedBy: currentUser.userId,
    });

    await this.assignmentRepo.save(assignment);

    // Log audit
    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId!,
      action: AuditAction.SCHOOL_ASSIGNED,
      entity: 'mentor',
      entityId: mentorId,
      details: `${mentor.firstName} ${mentor.lastName} assigned to ${school.name}`,
      metadata: { schoolId, schoolName: school.name },
    });

    return {
      message: 'Mentor assigned to school successfully',
      assignment: this.formatAssignment(assignment),
    };
  }

  // ─── ASSIGN MENTOR TO SPECIFIC CLASS(ES) ─────────────────────────────────
  async assignMentorToClasses(
    mentorId: string,
    classIds: string[],
    currentUser: AuthenticatedUser,
  ) {
    const mentor = await this.validateMentor(
      mentorId,
      currentUser.organizationId!,
    );

    // Validate all classes belong to same school and org
    const classes = await this.classRepo.find({
     where: { classId: In(classIds) },
    });

    if (classes.length !== classIds.length) {
      throw new BadRequestException('One or more classes not found');
    }

    const schoolId = classes[0].schoolId;
    if (!classes.every((c) => c.schoolId === schoolId)) {
      throw new BadRequestException(
        'All classes must belong to the same school',
      );
    }

    // Check for existing assignments
    const existing = await this.assignmentRepo.find({
      where: {
        mentorId,
        classId: In(classIds),
        scope: AssignmentScope.CLASS,
        isActive: true,
      },
    });

    if (existing.length > 0) {
      throw new BadRequestException(
        'Mentor is already assigned to one or more of these classes',
      );
    }

    // Create multiple assignments (one per class)
    const assignments = classIds.map((classId) =>
      this.assignmentRepo.create({
        mentorId,
        organizationId: currentUser.organizationId!,
        scope: AssignmentScope.CLASS,
        schoolId,
        classId,
        assignedBy: currentUser.userId,
      }),
    );

    await this.assignmentRepo.save(assignments);

    // Log audit
    const classNames = classes.map((c) => c.className).join(', ');
    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId!,
      action: AuditAction.SCHOOL_ASSIGNED, // You might want to add CLASS_ASSIGNED
      entity: 'mentor',
      entityId: mentorId,
      details: `${mentor.firstName} ${mentor.lastName} assigned to classes: ${classNames}`,
      metadata: { classIds, classNames },
    });

    return {
      message: 'Mentor assigned to classes successfully',
      assignments: assignments.map((a) => this.formatAssignment(a)),
    };
  }

  // ─── ASSIGN MENTOR TO SPECIFIC STUDENTS ──────────────────────────────────
  async assignMentorToStudents(
    mentorId: string,
    studentIds: string[],
    currentUser: AuthenticatedUser,
  ) {
    const mentor = await this.validateMentor(
      mentorId,
      currentUser.organizationId!,
    );

    // Validate all students
    const students = await this.studentRepo.find({
    where: { studentId: In(studentIds), registeredByOrgId: currentUser.organizationId! },

    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException('One or more students not found');
    }

    // Check for existing assignments
    const existing = await this.assignmentRepo.find({
      where: {
        mentorId,
        studentId: In(studentIds),
        scope: AssignmentScope.STUDENT,
        isActive: true,
      },
    });

    if (existing.length > 0) {
      throw new BadRequestException(
        'Mentor is already assigned to one or more of these students',
      );
    }

    // Create multiple assignments (one per student)
    const assignments = students.map((student) =>
      this.assignmentRepo.create({
        mentorId,
        organizationId: currentUser.organizationId!,
        scope: AssignmentScope.STUDENT,
        schoolId: student.schoolId,
        classId: student.classId,
        studentId: student.studentId,
        assignedBy: currentUser.userId,
      }),
    );

    await this.assignmentRepo.save(assignments);

    // Log audit
    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId!,
      action: AuditAction.STUDENT_ASSIGNED,
      entity: 'mentor',
      entityId: mentorId,
      details: `${mentor.firstName} ${mentor.lastName} assigned to ${studentIds.length} student(s)`,
      metadata: { studentIds, studentCount: studentIds.length },
    });

    return {
      message: 'Mentor assigned to students successfully',
      assignments: assignments.map((a) => this.formatAssignment(a)),
    };
  }

  // ─── GET MENTOR'S ASSIGNED STUDENTS (COMPUTED) ───────────────────────────
  async getMentorAssignedStudents(mentorId: string, organizationId: string) {
    const assignments = await this.assignmentRepo.find({
      where: { mentorId, organizationId, isActive: true },
      relations: ['school', 'class'],
    });

    // Compute all student IDs based on scope
    const studentIds = new Set<string>();

    for (const assignment of assignments) {
      switch (assignment.scope) {
        case AssignmentScope.SCHOOL: {
          const schoolStudents = await this.studentRepo.find({
            where: { schoolId: assignment.schoolId, isActive: true },
            select: ['studentId'],
          });
          schoolStudents.forEach((s) => studentIds.add(s.studentId));
          break;
        }
        case AssignmentScope.CLASS: {
          const classStudents = await this.studentRepo.find({
            where: { classId: assignment.classId, isActive: true },
            select: ['studentId'],
          });
          classStudents.forEach((s) => studentIds.add(s.studentId));
          break;
        }
        case AssignmentScope.STUDENT: {
          if (assignment.studentId) studentIds.add(assignment.studentId);
          break;
        }
      }
    }

    if (studentIds.size === 0) {
      return {
        totalStudents: 0,
        stats: {
          total: 0,
          enrolled: 0,
          lowRisk: 0,
          mediumRisk: 0,
          highRisk: 0,
        },
        schools: [],
        assignments: assignments.map((a) => this.formatAssignment(a)),
      };
    }

    // Fetch full student details with school and class relations
    const students = await this.studentRepo.find({
      where: { studentId: In(Array.from(studentIds)) },
      relations: ['school', 'class'],
    });

    // Fetch last 30 days attendance for all students
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const attendanceRecords = await this.attendanceRepo
      .createQueryBuilder('att')
      .where('att.studentId IN (:...studentIds)', {
        studentIds: Array.from(studentIds),
      })
      .andWhere('att.attendanceDate >= :dateStr', { dateStr })
      .select(['att.studentId', 'att.status', 'att.attendanceDate'])
      .getMany();

    // Group attendance by studentId
    const attendanceByStudent = attendanceRecords.reduce(
      (acc, rec) => {
        if (!acc[rec.studentId]) acc[rec.studentId] = [];
        acc[rec.studentId].push(rec);
        return acc;
      },
      {} as Record<string, typeof attendanceRecords>,
    );

    // Format each student with attendance rate
    const formattedStudents = students.map((student) => {
      const records = attendanceByStudent[student.studentId] ?? [];
      const totalDays = records.length;
      const presentDays = records.filter(
        (r) =>
          r.status === AttendanceStatus.PRESENT ||
          r.status === AttendanceStatus.LATE,
      ).length;
      const attendanceRate =
        totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

      const attendanceStatus =
        attendanceRate === null
          ? 'no_data'
          : attendanceRate >= 80
            ? 'good'
            : attendanceRate >= 60
              ? 'fair'
              : 'poor';

      return {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        gender: student.gender ?? null,
        studentCode: student.schoolId ?? null,
        dateOfBirth: student.dateOfBirth ?? null,
        guardianContact: student.guardianPhone  ?? null,
        isActive: student.isActive,
        riskLevel: null,
        performanceStatus: null,
        attendanceRate,
        attendanceStatus,
        schoolId: student.schoolId,
        schoolName: student.school?.name ?? null,
        classId: student.classId ?? null,
        className: student.class?.className ?? null,
        createdAt: student.createdAt,
      };
    });

    // Group students by school → class for the UI tree view
    const schoolMap: Record<
      string,
      {
        schoolId: string;
        schoolName: string;
        totalStudents: number;
        classes: Record<
          string,
          {
            classId: string | null;
            className: string | null;
            students: typeof formattedStudents;
          }
        >;
      }
    > = {};

    for (const student of formattedStudents) {
      const sId = student.schoolId;
      if (!schoolMap[sId]) {
        schoolMap[sId] = {
          schoolId: sId,
          schoolName: student.schoolName ?? 'Unknown School',
          totalStudents: 0,
          classes: {},
        };
      }
      const cId = student.classId ?? 'unclassified';
      if (!schoolMap[sId].classes[cId]) {
        schoolMap[sId].classes[cId] = {
          classId: student.classId,
          className: student.className ?? 'Unclassified',
          students: [],
        };
      }
      schoolMap[sId].classes[cId].students.push(student);
      schoolMap[sId].totalStudents++;
    }

    // Flatten to array
    const schools = Object.values(schoolMap).map((school) => ({
      ...school,
      classes: Object.values(school.classes),
    }));

    // Compute stats
    const stats = {
      total: formattedStudents.length,
      enrolled: formattedStudents.filter((s) => s.isActive).length,
      lowRisk: formattedStudents.filter((s) => s.riskLevel === 'green').length,
      mediumRisk: formattedStudents.filter((s) => s.riskLevel === 'amber')
        .length,
      highRisk: formattedStudents.filter((s) => s.riskLevel === 'red').length,
    };

    return {
      totalStudents: formattedStudents.length,
      stats,
      schools, // grouped: schools → classes → students
      students: formattedStudents, // flat list for simple table view
      assignments: assignments.map((a) => this.formatAssignment(a)),
    };
  }

  // ─── GET MENTOR'S ASSIGNED SCHOOLS ───────────────────────────────────────
  async getMentorAssignedSchools(mentorId: string, organizationId: string) {
    const assignments = await this.assignmentRepo.find({
      where: {
        mentorId,
        organizationId,
        isActive: true,
      },
      relations: ['school'],
    });

    // Get unique schools
    const schoolIds = new Set(
      assignments.map((a) => a.schoolId).filter(Boolean) as string[],
    );

    const schools = await this.schoolRepo.find({
      where: { schoolId: In(Array.from(schoolIds)) },
    });

    return {
      totalSchools: schools.length,
      schools: schools.map(this.formatSchool),
    };
  }

  // ─── UNASSIGN MENTOR ──────────────────────────────────────────────────────
  async unassignMentor(assignmentId: string, currentUser: AuthenticatedUser) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, organizationId: currentUser.organizationId! },
      relations: ['mentor'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    assignment.isActive = false;
    assignment.unassignedAt = new Date();
    assignment.unassignedBy = currentUser.userId;

    await this.assignmentRepo.save(assignment);

    // Log audit
    await this.auditService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId!,
      action: 'Assignment Removed' as any,
      entity: 'mentor',
      entityId: assignment.mentorId,
      details: `Removed ${assignment.scope} assignment`,
      metadata: { assignmentId, scope: assignment.scope },
    });

    return { message: 'Assignment removed successfully' };
  }

  async getAllAssignments(
    organizationId: string,
    filters: {
      mentorId?: string;
      schoolId?: string;
      scope?: string;
      isActive?: boolean;
    },
  ) {
    const query: any = { organizationId };

    if (filters.mentorId) query.mentorId = filters.mentorId;
    if (filters.schoolId) query.schoolId = filters.schoolId;
    if (filters.scope) query.scope = filters.scope;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const assignments = await this.assignmentRepo.find({
      where: query,
      relations: ['mentor', 'school', 'class', 'student'],
      order: { assignedAt: 'DESC' },
    });

    return {
      message: 'Success',
      totalAssignments: assignments.length,
      items: assignments.map((a) => ({
        ...this.formatAssignment(a),
        mentorName: a.mentor
          ? `${a.mentor.firstName} ${a.mentor.lastName}`
          : null,
        schoolName: a.school?.name,
        className: a.class?.className,
        studentName: a.student
          ? `${a.student.firstName} ${a.student.lastName}`
          : null,
      })),
    };
  }

  async getAssignmentStatistics(organizationId: string) {
    const [
      totalMentors,
      totalAssignments,
      schoolAssignments,
      classAssignments,
      studentAssignments,
    ] = await Promise.all([
      this.userRepo.count({
        where: { organizationId, roles: In(['mentor' as any]) },
      }),
      this.assignmentRepo.count({ where: { organizationId, isActive: true } }),
      this.assignmentRepo.count({
        where: {
          organizationId,
          isActive: true,
          scope: AssignmentScope.SCHOOL,
        },
      }),
      this.assignmentRepo.count({
        where: { organizationId, isActive: true, scope: AssignmentScope.CLASS },
      }),
      this.assignmentRepo.count({
        where: {
          organizationId,
          isActive: true,
          scope: AssignmentScope.STUDENT,
        },
      }),
    ]);

    // Get mentors with at least one assignment
    const mentorsWithAssignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .select('DISTINCT assignment.mentorId')
      .where('assignment.organizationId = :organizationId', { organizationId })
      .andWhere('assignment.isActive = :isActive', { isActive: true })
      .getRawMany();

    return {
      message: 'Success',
      stats: {
        totalMentors,
        mentorsWithAssignments: mentorsWithAssignments.length,
        unassignedMentors: totalMentors - mentorsWithAssignments.length,
        totalAssignments,
        schoolAssignments,
        classAssignments,
        studentAssignments,
      },
    };
  }

  async getMentorsStudentDetail(
    studentId: string,
    query: StudentDetailQueryDto,
  ): Promise<StudentDetailResponse> {
    // Fetch student with all relations
    const student = await this.studentRepo.findOne({
      where: { studentId },
      relations: ['class', 'school', 'school.organization'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // ✅ ADD THIS SECTION - Fetch current active calendar for the school
    const currentCalendar = await this.calendarRepository.findOne({
      where: {
        schoolId: student.schoolId,
        isCurrent: true,
      },
    });

    // Build attendance query
    const attendanceWhere: any = {
      studentId: student.studentId,
    };

    // Add calendar filters if available
    if (currentCalendar) {
      attendanceWhere.academicYear = currentCalendar.academicYear;
      // Optional: If your attendance table has termName column, uncomment:
      // attendanceWhere.termName = currentCalendar.termName;
    }

    // Date range filter
    if (query.startDate && query.endDate) {
      attendanceWhere.attendanceDate = Between(query.startDate, query.endDate);
    } else if (query.startDate) {
      attendanceWhere.attendanceDate = Between(
        query.startDate,
        new Date().toISOString().split('T')[0],
      );
    } else if (currentCalendar) {
      // Use calendar date range if no specific dates provided
      attendanceWhere.attendanceDate = Between(
        currentCalendar.startDate,
        currentCalendar.endDate,
      );
    }

    // Fetch attendance records
    const attendanceRecords = await this.attendanceRepo.find({
      where: attendanceWhere,
      relations: ['photos', 'gpsLogs'],
      order: { attendanceDate: 'DESC' },
    });

    // Calculate attendance statistics
    const stats = this.calculateAttendanceStats(attendanceRecords);

    // Map attendance records to DTOs
    const attendanceRecordDtos: AttendanceRecordDto[] = attendanceRecords.map(
      (record) => ({
        attendanceId: record.attendanceId,
        attendanceDate: record.attendanceDate,
        status: record.status,
        mode: record.mode,
        academicYear: record.academicYear,
        currentTerm: record.currentTerm,
        remark: record.remark,
        markedByUserId: record.markedByUserId,
        deviceId: record.deviceId,
        gpsValidationStatus: record.gpsValidationStatus,
        hasPhotos: record.photos && record.photos.length > 0,
        hasGpsLogs: record.gpsLogs && record.gpsLogs.length > 0,
        createdAt: record.createdAt,
      }),
    );

    // Build response
    const response: StudentDetailResponse = {
      studentInfo: {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        fullName:
          `${student.firstName} ${student.middleName|| ''} ${student.lastName}`.trim(),
        gender: student.gender ?? '',
       dateOfBirth: student.dateOfBirth?.toISOString().split('T')[0] ?? '',
        studentCode: student.studentId ?? '',
        enrollmentDate: student.createdAt,
      },

      classInfo: student.class
        ? {
            classId: student.class.classId,
            className: student.class.className,
            hierarchyLevel: student.class.hierarchyLevel,
            headTeacherId: student.class.headTeacher,
            isTerminal: student.class.isTerminal,
          }
        : undefined,

      schoolInfo: {
        schoolId: student.school.schoolId,
        name: student.school.name,
        code: student.school.code,
        address: student.school.address,
        state: student.school.state,
        city: student.school.city,
      },

      organizationInfo: {
       organizationId: '',
organizationName: 'Unknown Organization',
      },

      // ✅ Return current calendar info
      currentCalendar: currentCalendar
        ? {
            calendarId: currentCalendar.calendarId,
            academicYear: currentCalendar.academicYear,
            termName: currentCalendar.termName,
            termOrder: currentCalendar.termOrder,
            startDate: currentCalendar.startDate,
            endDate: currentCalendar.endDate,
            isCurrent: currentCalendar.isCurrent,
            status: currentCalendar.status,
            holidays: currentCalendar.holidays,
          }
        : undefined,

      attendanceRecords: attendanceRecordDtos,

      attendanceStats: stats,
    };

    return response;
  }
  private calculateAttendanceStats(records: StudentAttendanceRecord[]) {
    const totalRecords = records.length;

    const presentCount = records.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const absentCount = records.filter(
      (r) => r.status === AttendanceStatus.ABSENT,
    ).length;
    const lateCount = records.filter(
      (r) => r.status === AttendanceStatus.LATE,
    ).length;
    const excusedCount = records.filter(
      (r) => r.status === AttendanceStatus.EXCUSED,
    ).length;

    const attendanceRate =
      totalRecords > 0
        ? Math.round((presentCount / totalRecords) * 100 * 100) / 100
        : 0;

    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate,
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  private async validateMentor(mentorId: string, organizationId: string) {
    const mentor = await this.userRepo.findOne({
      where: { id: mentorId, organizationId },
    });
    if (!mentor) {
      throw new NotFoundException('Mentor not found');
    }
    // Check if user has mentor role
    if (!mentor.roles.includes('mentor' as any)) {
      throw new BadRequestException('User is not a mentor');
    }
    return mentor;
  }

  private async validateSchool(schoolId: string, organizationId: string) {
    const school = await this.schoolRepo.findOne({
      where: { schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  private formatAssignment(assignment: MentorAssignment) {
    return {
      id: assignment.id,
      mentorId: assignment.mentorId,
      scope: assignment.scope,
      schoolId: assignment.schoolId,
      classId: assignment.classId,
      studentId: assignment.studentId,
      assignedBy: assignment.assignedBy,
      assignedAt: assignment.assignedAt,
      isActive: assignment.isActive,
    };
  }

  private formatStudent(student: StudentProfile) {
    return {
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      schoolId: student.schoolId,
      classId: student.classId,
      isActive: student.isActive,
    };
  }

  private formatSchool(school: School) {
    return {
      schoolId: school.schoolId,
      name: school.name,
      address: school.address,
      isActive: school.isActive,
    };
  }
}
