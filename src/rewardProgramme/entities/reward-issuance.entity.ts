import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrganizationUser } from '../../organization-user/entities/organization-user.entity';
import { RewardProgramme } from './reward-programme.entity';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';

import { School } from '../../school/entities/school.entity';
import { SchoolCalendar } from '../../school-calendar/entities/school-calendar.entity';

@Entity({ name: 'reward_issuances' })
export class RewardIssuance {
  @PrimaryColumn({
    name: 'issuance_id',
    type: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  issuanceId: string;

  @Column({ name: 'programme_id', type: 'uuid' })
  programmeId: string;

  @ManyToOne(() => RewardProgramme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programme_id' })
  programme: RewardProgramme;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // Recipient — one of these will be set depending on programme type
  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school?: School;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string;

  @ManyToOne(() => StudentProfile, { nullable: true })
  @JoinColumn({ name: 'student_id' })
  student?: StudentProfile;

  @Column({ name: 'calendar_id', type: 'uuid', nullable: true })
  calendarId?: string;

  @ManyToOne(() => SchoolCalendar, { nullable: true })
  @JoinColumn({ name: 'calendar_id' })
  calendar?: SchoolCalendar;

  @Column({ name: 'recipient_type', type: 'enum', enum: ['school', 'family'] })
  recipientType: 'school' | 'family';

  @Column({
    type: 'enum',
    enum: ['issued', 'pending', 'approved', 'cancelled'],
    default: 'pending',
  })
  status: 'issued' | 'pending' | 'approved' | 'cancelled';

  // Snapshot of metrics at time of issuance
  @Column({ name: 'attendance_rate_snapshot', type: 'float', nullable: true })
  attendanceRateSnapshot?: number;

  @Column({ name: 'attendance_change_snapshot', type: 'float', nullable: true })
  attendanceChangeSnapshot?: number;

  @Column({ name: 'performance_score_snapshot', type: 'float', nullable: true })
  performanceScoreSnapshot?: number;

  @Column({ name: 'period_label', type: 'text', nullable: true })
  periodLabel?: string; // e.g. "March 2024", "Term 1, 2024"

  @Column({ name: 'value_label', type: 'text', nullable: true })
  valueLabel?: string; // e.g. "R500", "R5,000 package"

  // Outcome tracking — filled in after the next period
  @Column({ name: 'outcome_change', type: 'float', nullable: true })
  outcomeChange?: number;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @ManyToOne(() => OrganizationUser, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: OrganizationUser;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
