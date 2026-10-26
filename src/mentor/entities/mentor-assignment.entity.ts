import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { OrganizationUser } from '../../organization-user/entities/organization-user.entity';
import { School } from '../../school/entities/school.entity';
import { Class } from '../../school/entities/school-class.entity';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';

export enum AssignmentScope {
  SCHOOL = 'school',
  CLASS = 'class',
  STUDENT = 'student',
}

@Entity('mentor_assignments')
@Index('idx_mentor_assignment_mentor', ['mentorId'])
@Index('idx_mentor_assignment_org', ['organizationId'])
@Index('idx_mentor_assignment_school', ['schoolId'])
@Index('idx_mentor_assignment_class', ['classId'])
@Index('idx_mentor_assignment_student', ['studentId'])
@Index('idx_mentor_assignment_active', ['mentorId', 'isActive'])
@Index('idx_mentor_assignment_scope', ['mentorId', 'scope', 'isActive'])
// ✅ Prevent duplicate active assignments
@Index('idx_unique_active_school_mentor', ['mentorId', 'schoolId', 'isActive'], {
  unique: true,
  where: "scope = 'school' AND is_active = true AND school_id IS NOT NULL",
})
@Index('idx_unique_active_class_mentor', ['mentorId', 'classId', 'isActive'], {
  unique: true,
  where: "scope = 'class' AND is_active = true AND class_id IS NOT NULL",
})
@Index('idx_unique_active_student_mentor', ['mentorId', 'studentId', 'isActive'], {
  unique: true,
  where: "scope = 'student' AND is_active = true AND student_id IS NOT NULL",
})
export class MentorAssignment {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'mentor_id', type: 'uuid' })
  mentorId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: AssignmentScope,
  })
  scope: AssignmentScope;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId?: string;

  @Column({ name: 'class_id', type: 'uuid', nullable: true })
  classId?: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedBy: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'unassigned_at', type: 'timestamptz', nullable: true })
  unassignedAt?: Date;

  @Column({ name: 'unassigned_by', type: 'uuid', nullable: true })
  unassignedBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Relations
  @ManyToOne(() => OrganizationUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor: OrganizationUser;

  @ManyToOne(() => School, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'school_id' })
  school?: School;

  @ManyToOne(() => Class, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class?: Class;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'student_id' })
  student?: StudentProfile;

  @ManyToOne(() => OrganizationUser)
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: OrganizationUser;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}