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

@Entity({ name: 'attendance_photos' })
@Index('idx_attendance_photos_attendance', ['attendanceId'])
export class StudentAttendancePhoto {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  photoId: string;

  @Column({ name: 'attendance_id', type: 'uuid' })
  attendanceId: string;

  @ManyToOne(() => StudentAttendanceRecord, (a) => a.photos, {
    onDelete: 'CASCADE',
  })
  attendance: StudentAttendanceRecord;

  @Column({ name: 'photo_url', type: 'text' })
  photoUrl: string;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;
}
