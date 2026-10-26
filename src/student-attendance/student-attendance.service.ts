import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStudentAttendanceDto } from './dto/create-student-attendance.dto';
import { UpdateStudentAttendanceDto } from './dto/update-student-attendance.dto';
import { StudentAttendanceRecord } from './entities/student-attendance.entity';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AttendanceMode,
  AttendanceDateRange,
  GpsValidationStatus,
  AttendanceStatus,
  AttendanceSyncStatus,
} from 'src/common/enum/attendance.enums';

import {
  AttendanceQueryDto,
  SchoolAttendanceSummaryDto,
  AttendanceTrendDto,
  AttendanceRecordDto,
  AttendanceDashboardDto,
} from './dto/attendance-dashboard.dto';

interface ClassDaySummary {
  id: string;
  date: string;
  schoolId: string;
  schoolCode: string;
  schoolName: string;
  classId: string;
  className: string;
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  modes: Set<AttendanceMode>;
  hasGPSFlag: boolean;
  hasAnomaly: boolean;
  syncStatuses: Set<AttendanceSyncStatus>;
  capturedBy: string;
  capturedAt: Date;
  students: Array<{ name: string; code: string }>;
}

function resolveDateRange(
  range: AttendanceDateRange = AttendanceDateRange.LAST_7_DAYS,
): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const end = fmt(now);

  switch (range) {
    case AttendanceDateRange.TODAY:
      return [end, end];

    case AttendanceDateRange.LAST_7_DAYS: {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return [fmt(start), end];
    }

    case AttendanceDateRange.LAST_30_DAYS: {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return [fmt(start), end];
    }

    case AttendanceDateRange.THIS_MONTH: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return [fmt(start), end];
    }

    default:
      return [end, end];
  }
}

/** Convert AttendanceMode enum → human-readable label used by the frontend */
const map: Record<AttendanceMode, string> = {
  [AttendanceMode.GPS]: 'GPS Check-in',
  [AttendanceMode.MANUAL]: 'Manual',
  [AttendanceMode.FACE_RECOGNITION]: 'Face Recognition',
  [AttendanceMode.QR_CODE]: 'QR Code',
  [AttendanceMode.NFC]: 'NFC',
  [AttendanceMode.PHOTO]: 'Photo',
};

/** Format a Date → "08:45 AM" */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Short weekday label from a date string */
function shortDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

@Injectable()
export class StudentAttendanceService {
  constructor(
    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,
  ) {}

  async create(
    dto: CreateStudentAttendanceDto,
  ): Promise<StudentAttendanceRecord> {
    // Enforce the unique constraint gracefully before hitting the DB index
    const existing = await this.attendanceRepo.findOne({
      where: {
        schoolId: dto.schoolId,
        classId: dto.classId,
        studentId: dto.studentId,
        attendanceDate: dto.attendanceDate,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Attendance already recorded for student ${dto.studentId} on ${dto.attendanceDate}`,
      );
    }

    const record = this.attendanceRepo.create({
      ...dto,
      syncStatus: AttendanceSyncStatus.PENDING, // always starts pending
    });

    return this.attendanceRepo.save(record);
  }

  async findAll(organizationId: string): Promise<StudentAttendanceRecord[]> {
    return this.attendanceRepo.find({
      where: { organizationId },
      relations: ['school', 'class', 'student'],
      order: { attendanceDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(attendanceId: string): Promise<StudentAttendanceRecord> {
    const record = await this.attendanceRepo.findOne({
      where: { attendanceId },
      relations: ['school', 'class', 'student', 'gpsLogs', 'photos'],
    });

    if (!record) {
      throw new NotFoundException(
        `Attendance record with id "${attendanceId}" not found`,
      );
    }

    return record;
  }

  async getDashboard(
    organizationId: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceDashboardDto> {
    const [startDate, endDate] = resolveDateRange(query.dateRange);

    // Fetch all records in the date window for this org, eager-loading relations
    // needed to build every frontend field.
    const allRecords = await this.attendanceRepo.find({
      where: {
        organizationId,
        attendanceDate: Between(startDate, endDate),
        ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      } as FindOptionsWhere<StudentAttendanceRecord>,
      relations: ['school', 'class', 'student','markedBy'],
      order: { attendanceDate: 'DESC', createdAt: 'DESC' },
    });

    // ── Aggregate class-level summaries (one row per school+class+date combo) ─
    const classSummaries = this.aggregateByClassDay(allRecords);

    // ── Metric cards ───────────────────────────────────────────────────────────
    const orgAttendanceRate = this.calcOrgRate(allRecords);
    const schoolsBelowThreshold = this.countSchoolsBelowThreshold(
      allRecords,
      80,
    );
    const studentsWithRepeatedAbsences = this.countRepeatedAbsences(
      allRecords,
      3,
    );
    const trendVsPrevious = await this.calcTrend(
      organizationId,
      startDate,
      endDate,
    );

    // ── Chart data ─────────────────────────────────────────────────────────────
    const attendanceTrends = this.buildTrends(allRecords, startDate, endDate);
    const schoolAttendance = this.buildSchoolSummaries(allRecords);

    // ── Table records (apply extra filters, then map to DTO) ──────────────────
    const filtered = this.applyTableFilters(classSummaries, query);
    const records: AttendanceRecordDto[] = filtered.map((s) =>
      this.toRecordDto(s),
    );

    // ── Last synced ────────────────────────────────────────────────────────────
    const lastSyncedAt =
      allRecords.length > 0
        ? allRecords
            .map((r) => r.updatedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]
            .toISOString()
        : new Date().toISOString();

    return {
      orgAttendanceRate,
      schoolsBelowThreshold,
      studentsWithRepeatedAbsences,
      trendVsPrevious,
      attendanceTrends,
      schoolAttendance,
      records,
      totalRecords: classSummaries.length,
      lastSyncedAt,
    };
  }

  // ── Aggregation helpers ─────────────────────────────────────────────────────

  /**
   * Groups individual student records → class-level summaries.
   * One summary = one unique (school, class, date) triple.
   */
  private aggregateByClassDay(
    records: StudentAttendanceRecord[],
  ): ClassDaySummary[] {
    const map = new Map<string, ClassDaySummary>();

    for (const r of records) {
      const key = `${r.schoolId}__${r.classId}__${r.attendanceDate}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          date: r.attendanceDate,
          schoolId: r.schoolId,
          schoolName: r.school?.name ?? r.schoolId,
          schoolCode: r.school?.code ?? '', 
          classId: r.classId,
          className: r.class?.className ?? r.classId,
          students: [],
          presentCount: 0,
          absentCount: 0,
          totalStudents: 0,
          modes: new Set<AttendanceMode>(),
          hasGPSFlag: false,
          hasAnomaly: false,
          syncStatuses: new Set<AttendanceSyncStatus>(),
         capturedBy: r.markedBy
  ? `${(r.markedBy as any).firstName} ${(r.markedBy as any).lastName}`
  : r.markedByUserId ?? 'Unknown',
          capturedAt: r.createdAt,
        });
      }

      const summary = map.get(key)!;
      summary.totalStudents += 1;
      const studentName = r.student
  ? `${r.student.firstName} ${r.student.lastName}`
  : r.studentId;
const studentCode = r.student?.studentId ?? '';
summary.students.push({ name: studentName, code: studentCode });

      if (r.status === AttendanceStatus.PRESENT) {
        summary.presentCount += 1;
      } else {
        summary.absentCount += 1;
      }

      summary.modes.add(r.mode);

      // Flag if any student record in the class has a GPS anomaly
      if (r.gpsValidationStatus === GpsValidationStatus.FAILED) {
        summary.hasGPSFlag = true;
      }

      // Anomaly: class attendance below 60% is suspicious
      const rate = summary.presentCount / (summary.totalStudents || 1);
      if (rate < 0.6) {
        summary.hasAnomaly = true;
      }

      summary.syncStatuses.add(r.syncStatus);
    }

    return Array.from(map.values());
  }

  /** Resolve a single syncStatus from a set of student-level statuses:
   *  Any CONFLICT → CONFLICT, any PENDING → PENDING, else SYNCED.
   */
  private resolveSyncStatus(
    statuses: Set<AttendanceSyncStatus>,
  ): AttendanceSyncStatus {
    if (statuses.has(AttendanceSyncStatus.CONFLICT))
      return AttendanceSyncStatus.CONFLICT;
    if (statuses.has(AttendanceSyncStatus.PENDING))
      return AttendanceSyncStatus.PENDING;
    return AttendanceSyncStatus.SYNCED;
  }

  private toRecordDto(s: ClassDaySummary): AttendanceRecordDto {
    const attendanceRate =
      s.totalStudents > 0
        ? Math.round((s.presentCount / s.totalStudents) * 1000) / 10
        : 0;

    return {
      id: s.id,
      date: s.date,
      school: s.schoolCode ? `${s.schoolName} (${s.schoolCode})` : s.schoolName,
      class: s.className,
      presentCount: s.presentCount,
      absentCount: s.absentCount,
      totalStudents: s.totalStudents,
      students: s.students,
      attendanceRate,
      modesUsed: Array.from(s.modes).map(modeLabel),
      hasGPSFlag: s.hasGPSFlag,
      hasAnomaly: s.hasAnomaly,
      syncStatus: this.resolveSyncStatus(s.syncStatuses),
      capturedBy: s.capturedBy,
      capturedAt: formatTime(s.capturedAt),
    };
  }

  // ── Metric card calculations ────────────────────────────────────────────────

  private calcOrgRate(records: StudentAttendanceRecord[]): number {
    if (!records.length) return 0;
    const present = records.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    return Math.round((present / records.length) * 1000) / 10;
  }

  private countSchoolsBelowThreshold(
    records: StudentAttendanceRecord[],
    threshold: number,
  ): number {
    const bySchool = new Map<string, { present: number; total: number }>();

    for (const r of records) {
      const entry = bySchool.get(r.schoolId) ?? { present: 0, total: 0 };
      entry.total += 1;
      if (r.status === AttendanceStatus.PRESENT) entry.present += 1;
      bySchool.set(r.schoolId, entry);
    }

    let count = 0;
    for (const { present, total } of bySchool.values()) {
      if (total > 0 && (present / total) * 100 < threshold) count++;
    }
    return count;
  }

  private countRepeatedAbsences(
    records: StudentAttendanceRecord[],
    minAbsences: number,
  ): number {
    const absencesByStudent = new Map<string, number>();

    for (const r of records) {
      if (r.status !== AttendanceStatus.PRESENT) {
        absencesByStudent.set(
          r.studentId,
          (absencesByStudent.get(r.studentId) ?? 0) + 1,
        );
      }
    }

    let count = 0;
    for (const absences of absencesByStudent.values()) {
      if (absences >= minAbsences) count++;
    }
    return count;
  }

  /**
   * Trend: compare current period rate to the equivalent previous period.
   * Returns delta in percentage points (positive = improvement).
   */
  private async calcTrend(
    organizationId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const dayCount =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        86_400_000 +
      1;

    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (dayCount - 1));

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const prevRecords = await this.attendanceRepo.find({
      where: {
        organizationId,
        attendanceDate: Between(fmt(prevStart), fmt(prevEnd)),
      } as FindOptionsWhere<StudentAttendanceRecord>,
      select: ['status'],
    });

    if (!prevRecords.length) return 0;

    const prevPresent = prevRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const prevRate = (prevPresent / prevRecords.length) * 100;

    const currentRecords = await this.attendanceRepo.find({
      where: {
        organizationId,
        attendanceDate: Between(startDate, endDate),
      } as FindOptionsWhere<StudentAttendanceRecord>,
      select: ['status'],
    });

    if (!currentRecords.length) return 0;

    const currentPresent = currentRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const currentRate = (currentPresent / currentRecords.length) * 100;

    return Math.round((currentRate - prevRate) * 10) / 10;
  }

  // ── Chart builders ──────────────────────────────────────────────────────────

  private buildTrends(
    records: StudentAttendanceRecord[],
    startDate: string,
    endDate: string,
  ): AttendanceTrendDto[] {
    const byDate = new Map<string, { present: number; total: number }>();

    for (const r of records) {
      const entry = byDate.get(r.attendanceDate) ?? { present: 0, total: 0 };
      entry.total += 1;
      if (r.status === AttendanceStatus.PRESENT) entry.present += 1;
      byDate.set(r.attendanceDate, entry);
    }

    // Walk every calendar day in the range so there are no gaps
    const result: AttendanceTrendDto[] = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);

    while (cursor <= end) {
      const key = cursor.toISOString().split('T')[0];
      const entry = byDate.get(key);
      result.push({
        date: shortDay(key),
        rate:
          entry && entry.total > 0
            ? Math.round((entry.present / entry.total) * 1000) / 10
            : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  private buildSchoolSummaries(
    records: StudentAttendanceRecord[],
  ): SchoolAttendanceSummaryDto[] {
    const bySchool = new Map<
      string,
      { name: string; present: number; absent: number }
    >();

    for (const r of records) {
      const name = r.school?.name ?? r.schoolId;
      const entry = bySchool.get(r.schoolId) ?? { name, present: 0, absent: 0 };
      if (r.status === AttendanceStatus.PRESENT) {
        entry.present += 1;
      } else {
        entry.absent += 1;
      }
      bySchool.set(r.schoolId, entry);
    }

    return Array.from(bySchool.values()).map(({ name, present, absent }) => ({
      school: name,
      rate: Math.round((present / (present + absent || 1)) * 1000) / 10,
      present,
      absent,
    }));
  }

  // ── Table filters ───────────────────────────────────────────────────────────

  private applyTableFilters(
    summaries: ClassDaySummary[],
    query: AttendanceQueryDto,
  ): ClassDaySummary[] {
    return summaries.filter((s) => {
      if (query.mode && query.mode !== 'all') {
        const hasMode = Array.from(s.modes).some((m) =>
          modeLabel(m).toLowerCase().includes(query.mode!.toLowerCase()),
        );
        if (!hasMode) return false;
      }

      if (query.flaggedOnly && !s.hasGPSFlag && !s.hasAnomaly) return false;

      return true;
    });
  }

  async update(
    attendanceId: string,
    dto: UpdateStudentAttendanceDto,
  ): Promise<StudentAttendanceRecord> {
    const record = await this.findOne(attendanceId); // throws 404 if missing

    // Immutable fields — silently strip them if somehow passed
    const {
      organizationId,
      schoolId,
      classId,
      studentId,
      attendanceDate,
      ...safeUpdates
    } = dto;

    Object.assign(record, safeUpdates);

    return this.attendanceRepo.save(record);
  }

  async remove(attendanceId: string): Promise<{ message: string }> {
    const record = await this.findOne(attendanceId); // throws 404 if missing

    await this.attendanceRepo.remove(record);

    return {
      message: `Attendance record "${attendanceId}" deleted successfully`,
    };
  }
}
function modeLabel(mode: AttendanceMode): string {
  const map: Record<AttendanceMode, string> = {
    [AttendanceMode.GPS]: 'GPS Check-in',
    [AttendanceMode.MANUAL]: 'Manual',
    [AttendanceMode.FACE_RECOGNITION]: 'Face Recognition',
    [AttendanceMode.QR_CODE]: 'QR Code',
    [AttendanceMode.NFC]: 'NFC',
    [AttendanceMode.PHOTO]: 'Photo',
  };
  return map[mode] ?? mode;
}
