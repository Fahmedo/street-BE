import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { StudentAttendanceRecord } from '../../student-attendance/entities/student-attendance.entity';

@Entity({ name: 'attendance_gps_logs' })
@Index('idx_attendance_gps_attendance', ['attendanceId'])
export class StudentAttendanceGpsLog {
   @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
    gpsId: string;

    @Column({ name: 'attendance_id', type: 'uuid' })
    attendanceId: string;

  @ManyToOne(() => StudentAttendanceRecord, (a) => a.gpsLogs, {
    onDelete: 'CASCADE',
  })
  attendance: StudentAttendanceRecord;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ name: 'accuracy_meters', type: 'double precision', nullable: true })
  accuracyMeters?: number;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;
}
