// src/mentor-overview/services/mentor-overview.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MentorAssignment,
  AssignmentScope,
} from 'src/mentor/entities/mentor-assignment.entity';
import { StudentProfile } from 'src/student-profile/entities/student-profile.entity';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { Intervention } from 'src/intervention/entities/intervention.entity';
import { SchoolCalendar } from 'src/school-calendar/entities/school-calendar.entity';
import { AttendanceStatus } from 'src/common/enum/attendance.enums';
import { InterventionStatus } from 'src/common/enum/intervention.enum';
import {
  MentorOverviewResponseDto,
  PriorityAlertDto,
  UpcomingFollowUpDto,
} from './dto/mentor-overview.dto';

@Injectable()
export class MentorOverviewService {
  constructor(
    @InjectRepository(MentorAssignment)
    private readonly assignmentRepo: Repository<MentorAssignment>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(Intervention)
    private readonly interventionRepo: Repository<Intervention>,

    @InjectRepository(SchoolCalendar)
    private readonly calendarRepo: Repository<SchoolCalendar>,
  ) {}

  async getOverview(
    mentorId: string,
    organizationId: string,
  ): Promise<MentorOverviewResponseDto> {
    // Get all student IDs assigned to this mentor
    const studentIds = await this.getAssignedStudentIds(
      mentorId,
      organizationId,
    );

    // Parallel fetch of all data
    const [stats, alerts, followUps] = await Promise.all([
      this.getStats(mentorId, organizationId, studentIds),
      this.getPriorityAlerts(studentIds),
      this.getUpcomingFollowUps(mentorId),
    ]);

    return {
      message: 'Mentor overview retrieved successfully',
      stats,
      priorityAlerts: alerts,
      upcomingFollowUps: followUps,
    };
  }

  // ─── HELPER: Get all student IDs assigned to mentor ────────────────────
  private async getAssignedStudentIds(
    mentorId: string,
    organizationId: string,
  ): Promise<string[]> {
    const assignments = await this.assignmentRepo.find({
      where: { mentorId, organizationId, isActive: true },
    });

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

    return Array.from(studentIds);
  }

  // ─── STATS ──────────────────────────────────────────────────────────────
  private async getStats(
    mentorId: string,
    organizationId: string,
    studentIds: string[],
  ) {
    // Get current calendar to determine "this term"
    const currentCalendar = await this.calendarRepo.findOne({
      where: { orgId: organizationId, isCurrent: true },
    });

    const [activeAlerts, inProgressInterventions, resolvedThisTerm] =
      await Promise.all([
        this.countActiveAlerts(studentIds),
        this.interventionRepo.count({
          where: {
            mentorId,
            status: InterventionStatus.SCHEDULED,
          },
        }),
        currentCalendar
          ? this.interventionRepo
              .createQueryBuilder('i')
              .where('i.mentor_id = :mentorId', { mentorId })
              .andWhere('i.status = :status', {
                status: InterventionStatus.COMPLETED,
              })
              .andWhere('i.date >= :start', {
                start: currentCalendar.startDate,
              })
              .andWhere('i.date <= :end', { end: currentCalendar.endDate })
              .getCount()
          : 0,
      ]);

    return {
      assignedStudents: studentIds.length,
      activeAlerts,
      inProgressInterventions,
      resolvedThisTerm,
    };
  }

  // ─── PRIORITY ALERTS ────────────────────────────────────────────────────
  private async getPriorityAlerts(
    studentIds: string[],
  ): Promise<PriorityAlertDto[]> {
    if (!studentIds.length) return [];

    const students = await this.studentRepo.find({
      where: { studentId: In(studentIds) },
      relations: ['school'],
    });

    // Get recent attendance (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentAttendance = await this.attendanceRepo
      .createQueryBuilder('a')
      .where('a.student_id IN (:...studentIds)', { studentIds })
      .andWhere('a.attendance_date >= :from', {
        from: twoWeeksAgo.toISOString().split('T')[0],
      })
      .orderBy('a.attendance_date', 'DESC')
      .getMany();

    // Group attendance by student
    const attendanceByStudent = new Map<string, StudentAttendanceRecord[]>();
    recentAttendance.forEach((r) => {
      if (!attendanceByStudent.has(r.studentId)) {
        attendanceByStudent.set(r.studentId, []);
      }
      attendanceByStudent.get(r.studentId)!.push(r);
    });

    const alerts: PriorityAlertDto[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const student of students) {
      const records = attendanceByStudent.get(student.studentId) ?? [];
      const totalRecords = records.length;
      const presentCount = records.filter(
        (r) => r.status === AttendanceStatus.PRESENT,
      ).length;
      const attendanceRate =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      // Check consecutive absences
      const lastThree = records.slice(0, 3);
      const consecutiveAbsences =
        lastThree.length === 3 &&
        lastThree.every((r) => r.status === AttendanceStatus.ABSENT);

      // High priority alerts
      if (consecutiveAbsences) {
        alerts.push({
          id: `${student.studentId}-consecutive`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          reason: 'Absent for 3 consecutive days',
          severity: 'high',
          date: today,
          attendanceRate,
        });
        continue;
      }

      if (consecutiveAbsences) {
        alerts.push({
          id: `${student.studentId}-highperf`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          reason: 'Low attendance + declining performance',
          severity: 'high',
          date: today,
          attendanceRate,
        });
        continue;
      }

      if (consecutiveAbsences) {
        alerts.push({
          id: `${student.studentId}-red`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          reason: 'High risk flag',
          severity: 'high',
          date: today,
          attendanceRate,
        });
        continue;
      }

      if (attendanceRate < 75) {
        alerts.push({
          id: `${student.studentId}-amber`,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          school: student.school?.name ?? '',
          schoolId: student.schoolId,
          reason: 'Low attendance',
          severity: 'medium',
          date: today,
          attendanceRate,
        });
      }
    }

    // Sort by severity (high first), limit to top 10
    alerts.sort(
      (a, b) => this.severityRank(b.severity) - this.severityRank(a.severity),
    );
    return alerts.slice(0, 10);
  }

  // ─── UPCOMING FOLLOW-UPS ────────────────────────────────────────────────
  private async getUpcomingFollowUps(
    mentorId: string,
  ): Promise<UpcomingFollowUpDto[]> {
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(now.getDate() + 7);

    const interventions = await this.interventionRepo.find({
      where: {
        mentorId,
        status: InterventionStatus.SCHEDULED,
      },
      relations: ['student'],
      order: { date: 'ASC' },
      take: 10,
    });

    return interventions
      .filter((i) => {
        const interventionDate = new Date(i.date);
        return interventionDate >= now && interventionDate <= oneWeekLater;
      })
      .map((i) => ({
        id: i.id,
        studentId: i.studentId,
        studentName: i.student
          ? `${i.student.firstName} ${i.student.lastName}`.trim()
          : 'Unknown',
        type: this.formatInterventionType(i.type),
        date: new Date(i.date).toISOString().split('T')[0],
        time: this.extractTime(i.date),
        notes: i.notes,
      }));
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────
  private async countActiveAlerts(studentIds: string[]): Promise<number> {
    if (!studentIds.length) return 0;

    const students = await this.studentRepo.find({
      where: { studentId: In(studentIds) },
      select: ['studentId'],
    });

    return students.filter(
      (s) =>  false,
    ).length;
  }

  private severityRank(severity: 'high' | 'medium' | 'low'): number {
    return severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
  }

  private formatInterventionType(type: string): string {
    const typeMap: Record<string, string> = {
      'phone-call': 'Phone Call',
      'home-visit': 'Home Visit',
      meeting: 'Meeting',
      other: 'Other',
    };
    return typeMap[type] || type;
  }

  private extractTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
