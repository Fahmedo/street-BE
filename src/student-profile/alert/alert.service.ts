import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { StudentProfile } from '../entities/student-profile.entity';
import { StudentAttendanceRecord } from '../../student-attendance/entities/student-attendance.entity';
import { AttendanceStatus } from '../../common/enum/attendance.enums';
import { OrganizationStudent } from '../entities/organization_students.entity';
import { MentorAssignment, AssignmentScope } from '../../mentor/entities/mentor-assignment.entity'; // ✅ Add this

export interface ComputedAlert {
  id: string;
  studentId: string;
  studentName: string;
  school: string;
  schoolId: string;
  trigger: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  dateTriggered: string;
  description: string;
  attendanceRate: number;
  riskLevel: string;
}

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentRepository: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepository: Repository<StudentAttendanceRecord>,

    @InjectRepository(OrganizationStudent)
    private readonly orgStudentRepo: Repository<OrganizationStudent>,

    @InjectRepository(MentorAssignment) // ✅ Add this
    private readonly mentorAssignmentRepo: Repository<MentorAssignment>,
  ) {}

  async getAlertsForMentor(
    mentorId: string,
    query: {
      status?: string;
      severity?: string;
      page?: number;
      perPage?: number;
    },
  ) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    // ✅ FIXED: Get student IDs from MentorAssignment table
    const assignments = await this.mentorAssignmentRepo.find({
      where: {
        mentorId,
        scope: AssignmentScope.STUDENT,
        isActive: true,
      },
      select: ['studentId'],
    });

    const studentIds = assignments.map((a) => a.studentId).filter(Boolean) as string[];

    if (studentIds.length === 0) {
      return this.buildResponse([], page, perPage, query);
    }

    // ✅ Get org students for these student IDs
    const orgStudents = await this.orgStudentRepo.find({
      where: { 
        studentId: In(studentIds),
        isActive: true,
      },
      relations: ['student', 'student.school'],
    });

    const students = orgStudents.map((os) => ({
      ...os.student,
      riskLevel: os.riskLevel ?? null,
      performanceStatus: os.orgSpecificNotes?.notes ?? null,
      _orgStudent: os,
    }));

    if (!students.length) {
      return this.buildResponse([], page, perPage, query);
    }

    // Get attendance records for last 14 days for all students
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

    const recentAttendance = await this.attendanceRepository
      .createQueryBuilder('a')
      .where('a.studentId IN (:...studentIds)', { studentIds })
      .andWhere('a.attendanceDate >= :from', { from: twoWeeksAgoStr })
      .orderBy('a.attendanceDate', 'DESC')
      .getMany();

    // Group attendance by studentId
    const attendanceByStudent = new Map<string, StudentAttendanceRecord[]>();
    recentAttendance.forEach((r) => {
      if (!attendanceByStudent.has(r.studentId)) {
        attendanceByStudent.set(r.studentId, []);
      }
      attendanceByStudent.get(r.studentId)!.push(r);
    });

    // Compute alerts
    const alerts: ComputedAlert[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const student of students) {
      const records = attendanceByStudent.get(student.studentId) ?? [];
      const totalRecords = records.length;
      const presentCount = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT,
      ).length;
      const attendanceRate =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      // Check consecutive absences (last 3 records)
      const lastThree = records.slice(0, 3);
      const consecutiveAbsences = lastThree.every(
        (r) => r.status === AttendanceStatus.ABSENT,
      );

      if (student.riskLevel === 'red' && consecutiveAbsences) {
        alerts.push({
          id: `${student.studentId}-consecutive`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          trigger: 'Consecutive Absences',
          severity: 'high',
          status: 'open',
          dateTriggered: today,
          description: `Student has been absent for ${lastThree.length} consecutive days. Immediate follow-up required.`,
          attendanceRate,
          riskLevel: student.riskLevel,
        });
        continue;
      }

      if (student.riskLevel === 'red' && student.performanceStatus === 'poor') {
        alerts.push({
          id: `${student.studentId}-highperf`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          trigger: 'Low Attendance + Declining Performance',
          severity: 'high',
          status: 'open',
          dateTriggered: today,
          description: `Student is at high risk with poor performance and attendance at ${attendanceRate}%.`,
          attendanceRate,
          riskLevel: student.riskLevel,
        });
        continue;
      }

      if (student.riskLevel === 'red') {
        alerts.push({
          id: `${student.studentId}-red`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          trigger: 'High Risk Flag',
          severity: 'high',
          status: 'open',
          dateTriggered: today,
          description: `Student has been flagged as high risk. Attendance at ${attendanceRate}%.`,
          attendanceRate,
          riskLevel: student.riskLevel,
        });
        continue;
      }

      if (student.riskLevel === 'amber') {
        alerts.push({
          id: `${student.studentId}-amber`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          trigger: attendanceRate < 80 ? 'Low Attendance' : 'Performance Drop',
          severity: 'medium',
          status: 'in-progress',
          dateTriggered: today,
          description:
            attendanceRate < 80
              ? `Attendance rate at ${attendanceRate}%. Monitoring required.`
              : `Performance flagged as ${student.performanceStatus}. Consider intervention.`,
          attendanceRate,
          riskLevel: student.riskLevel,
        });
      }
    }

    // Sort — high first
    alerts.sort(
      (a, b) => this.severityRank(b.severity) - this.severityRank(a.severity),
    );

    return this.buildResponse(alerts, page, perPage, query);
  }

  private buildResponse(
    alerts: ComputedAlert[],
    page: number,
    perPage: number,
    query: { status?: string; severity?: string },
  ) {
    // Apply filters
    let filtered = alerts;

    if (query.status && query.status !== 'all') {
      filtered = filtered.filter((a) => a.status === query.status);
    }

    if (query.severity && query.severity !== 'all') {
      filtered = filtered.filter((a) => a.severity === query.severity);
    }

    // Stats from unfiltered
    const stats = {
      total: alerts.length,
      open: alerts.filter((a) => a.status === 'open').length,
      inProgress: alerts.filter((a) => a.status === 'in-progress').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
    };

    // Paginate
    const totalItems = filtered.length;
    const skip = (page - 1) * perPage;
    const items = filtered.slice(skip, skip + perPage);

    return {
      message: 'Alerts retrieved successfully',
      stats,
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

  private severityRank(s: 'high' | 'medium' | 'low') {
    return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
  }
}