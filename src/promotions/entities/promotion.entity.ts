import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Organization } from '../../organization/entities/organization.entity';
import { School } from '../../school/entities/school.entity';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';
import { Class } from '../../school/entities/school-class.entity';

@Entity({ name: 'promotions' })
export class Promotion {
  @PrimaryColumn({ name: 'promotion_id', type: 'uuid', default: () => 'gen_random_uuid()' })
  promotionId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;

  @Column({ name: 'from_class_id', type: 'uuid' })
  fromClassId: string;

  @ManyToOne(() => Class, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'from_class_id' })
  fromClass: Class;

  @Column({ name: 'to_class_id', type: 'uuid', nullable: true })
  toClassId?: string;

  @ManyToOne(() => Class, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'to_class_id' })
  toClass: Class;

  @Column({ name: 'academic_year', type: 'text' })
  academicYear: string;

  @Column({ name: 'promoted_by', type: 'uuid' })
  promotedBy: string;

  @Column({ name: 'promotion_type', type: 'text', default: 'bulk' })
  promotionType: 'bulk' | 'individual';

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'promoted_at', type: 'timestamptz' })
  promotedAt: Date;
}