// src/intervention/entities/intervention.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrganizationUser } from '../../organization-user/entities/organization-user.entity';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';
import { School } from '../../school/entities/school.entity';
import { SchoolCalendar } from '../../school-calendar/entities/school-calendar.entity';
import {
  InterventionType,
  InterventionCategory,
  InterventionStatus,
  InterventionPriority,
} from '../../common/enum/intervention.enum';

@Entity('interventions')
@Index('idx_intervention_mentor', ['mentorId'])
@Index('idx_intervention_student', ['studentId'])
@Index('idx_intervention_org', ['organizationId'])
@Index('idx_intervention_date', ['date'])
@Index('idx_intervention_status', ['status'])
@Index('idx_intervention_calendar', ['calendarId'])                              // ← new
@Index('idx_intervention_student_calendar', ['studentId', 'calendarId'])        // ← new (common query)
export class Intervention {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'mentor_id', type: 'uuid' })
  mentorId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  // ✅ Link to SchoolCalendar — captures academic year + term in one FK
  @Column({ name: 'calendar_id', type: 'uuid', nullable: true })
  calendarId?: string;

  @ManyToOne(() => SchoolCalendar, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'calendar_id' })
  calendar?: SchoolCalendar;

  // ✅ Denormalized for fast filtering/reporting without joining calendar
  @Column({
    name: 'academic_year',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  academicYear?: string; // e.g. "2024/2025" — copied from calendar on create

  @Column({
    name: 'term_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  termName?: string; // e.g. "First Term" — copied from calendar on create

  @Column({ type: 'enum', enum: InterventionType })
  type: InterventionType;

  @Column({ type: 'enum', enum: InterventionCategory, nullable: true })
  category?: InterventionCategory;

  @Column({
    type: 'enum',
    enum: InterventionStatus,
    default: InterventionStatus.SCHEDULED,
  })
  status: InterventionStatus;

  @Column({
    type: 'enum',
    enum: InterventionPriority,
    default: InterventionPriority.MEDIUM,
    nullable: true,
  })
  priority?: InterventionPriority;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  outcome?: string;

  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  followUpRequired: boolean;

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate?: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => OrganizationUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor: OrganizationUser;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => OrganizationUser)
  @JoinColumn({ name: 'created_by' })
  creator: OrganizationUser;
}