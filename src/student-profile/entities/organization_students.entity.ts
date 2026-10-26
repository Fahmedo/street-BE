import { Class } from '../../school/entities/school-class.entity';
import { School } from '../../school/entities/school.entity';
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
import { StudentProfile } from './student-profile.entity';
import { Organization } from '../../organization/entities/organization.entity';

@Entity('organization_students')
@Index('idx_org_student_composite', ['organizationId', 'studentId'], {
  unique: true,
})
@Index('idx_org_student_org', ['organizationId'])
@Index('idx_org_student_student', ['studentId'])
export class OrganizationStudent {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.organizationStudents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentProfile, (student) => student.organizationStudents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;

  @Column({ name: 'enrollment_date', type: 'date' })
  enrollmentDate: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['active', 'graduated', 'withdrawn', 'transferred'],
    default: 'active',
  })
  status: string;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    nullable: true,
  })
  riskLevel?: string;

  // ❌ REMOVE THIS - use MentorAssignment instead
  // @Column({ name: 'assigned_mentor_id', type: 'uuid', nullable: true })
  // assignedMentorId?: string;

  @Column({ type: 'jsonb', nullable: true })
  interventions?: {
    type: string;
    date: string;
    notes: string;
    outcome?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  orgSpecificNotes?: {
    beneficiaryId?: string;
    programType?: string;
    specialNeeds?: string[];
    parentConsent?: boolean;
    notes?: string;
  };

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}