import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';
import {
  AttendanceMode,
  AttendanceStatus,
  GpsValidationStatus,
  AttendanceSyncStatus,
  DeviceType,
} from '../../common/enum/attendance.enums';
import { Class } from '../../school/entities/school-class.entity';
import { School } from '../../school/entities/school.entity';
import { StudentAttendanceGpsLog } from './student-attendance-gps-log.entity';
import { StudentAttendancePhoto } from './student-attendance-photo.entity';
import { OrganizationUser } from '../../organization-user/entities/organization-user.entity';
import { TermType } from '../../common/enum/term-type.enum';
import { SchoolCalendar } from '../../school-calendar/entities/school-calendar.entity';

@Entity({ name: 'attendance_records' })
@Index(
  'uq_attendance_unique',
  ['schoolId', 'classId', 'studentId', 'attendanceDate'],
  { unique: true },
)
@Index('idx_attendance_student', ['studentId', 'attendanceDate'])
@Index('idx_attendance_school_date', ['schoolId', 'attendanceDate'])
@Index('idx_attendance_tenant_date', ['attendanceDate'])
export class StudentAttendanceRecord {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  attendanceId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'marked_by_user_id', type: 'uuid', nullable: true })
  markedByUserId?: string;

  @Column({ name: 'calendar_id', type: 'uuid', nullable: true })
  calendarId?: string;

  @ManyToOne(() => SchoolCalendar, { nullable: true })
  @JoinColumn({ name: 'calendar_id' })
  calendar?: SchoolCalendar;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  @Column({ type: 'enum', enum: AttendanceMode })
  mode: AttendanceMode;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ name: 'academic_year', type: 'text' })
  academicYear: string;

  @Column({ name: 'current_term', type: 'enum', enum: TermType })
  currentTerm: TermType;

  @ManyToOne(() => OrganizationUser, { nullable: true })
  @JoinColumn({ name: 'marked_by_user_id' })
  markedBy?: OrganizationUser;

  @Column({ name: 'device_id', type: 'text', nullable: true })
  deviceId?: string;
  @Column({
    name: 'device_type',
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
    nullable: true,
  })
  deviceType?: DeviceType;

  
  @Column({
    name: 'gps_validation_status',
    type: 'enum',
    enum: GpsValidationStatus,
    default: GpsValidationStatus.UNKNOWN,
  })
  gpsValidationStatus: GpsValidationStatus;

  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: AttendanceSyncStatus,
    default: AttendanceSyncStatus.PENDING,
  })
  syncStatus: AttendanceSyncStatus;

  @OneToMany(() => StudentAttendanceGpsLog, (gps) => gps.attendance, {
    cascade: true,
  })
  gpsLogs: StudentAttendanceGpsLog[];

  @OneToMany(() => StudentAttendancePhoto, (photo) => photo.attendance, {
    cascade: true,
  })
  photos: StudentAttendancePhoto[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
