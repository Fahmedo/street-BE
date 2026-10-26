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
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { OrganizationStudent } from './organization_students.entity';
import { BadRequestException } from '@nestjs/common';

@Entity({ name: 'students' })
@Index('idx_students_school', ['schoolId'])
@Index('idx_students_class', ['classId'])
@Index('idx_students_national_id', ['nationalId'], { unique: true, where: 'national_id IS NOT NULL' })
export class StudentProfile {
  @PrimaryColumn({
    name: 'student_id',
    type: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  studentId: string;

  @Column({
    name: 'student_code', 
    type: 'text', 
    unique: true,
    nullable: true 
  })
  studentCode: string;


  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, (school) => school.students, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @ManyToOne(() => Class, (cls) => cls.students, { 
    onDelete: 'RESTRICT' // ✅ Don't allow deleting classes with students
  })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  // ✅ Core student identity (shared across all orgs)
  @Column({ name: 'first_name', type: 'text' })
  firstName: string;

  @Column({ name: 'middle_name', type: 'text', nullable: true })
  middleName?: string;

  @Column({ name: 'last_name', type: 'text' })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ name: 'gender', type: 'enum', enum: ['Male', 'Female', 'Other'] })
  gender: string;

  // ✅ Unique identifiers to prevent duplicates
  @Column({ name: 'national_id', type: 'text', nullable: true })
  nationalId?: string;

  @Column({ name: 'phone_number', type: 'text', nullable: true })
  phoneNumber?: string;

  @Column({ name: 'home_address', type: 'text', nullable: true })
  homeAddress?: string;

  @Column({ name: 'guardian_name', type: 'text', nullable: true })
  guardianName?: string;

  @Column({ name: 'guardian_phone', type: 'text', nullable: true })
  guardianPhone?: string;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string;

  // ✅ Track which org originally registered this student
  @Column({ name: 'registered_by_org_id', type: 'uuid' })
  registeredByOrgId: string;

  @Column({ name: 'registered_by_user_id', type: 'uuid', nullable: true })
  registeredByUserId?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => OrganizationStudent, (orgStudent) => orgStudent.student)
  organizationStudents: OrganizationStudent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

}