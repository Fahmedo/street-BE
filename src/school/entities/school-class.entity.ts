import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { School } from '../../school/entities/school.entity';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';

@Entity({ name: 'classes' })
@Index('idx_classes_school', ['schoolId'])

export class Class {
  @PrimaryColumn({ name: 'class_id', type: 'uuid', default: () => 'gen_random_uuid()' })
  classId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, (school) => school.classes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'class_name', type: 'text' })
  className: string;

  // e.g. Primary 1 = 1, Primary 2 = 2, JSS1 = 7, SS3 = 12
  @Column({ name: 'hierarchy_level', type: 'int' })
  hierarchyLevel: number;

  // ✅ ADDED: Track who created this class (super admin)
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string;

  // Optional: store userId of the head teacher for this class
  @Column({ name: 'head_teacher', type: 'text', nullable: true })
  headTeacher?: string;

  // Terminal class = students graduate instead of promoting to next level
  @Column({ name: 'is_terminal', type: 'boolean', default: false })
  isTerminal: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => StudentProfile, (student) => student.class)
  students: StudentProfile[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}