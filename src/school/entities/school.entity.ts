import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { Class } from '../../school/entities/school-class.entity';
import { StudentProfile } from '../../student-profile/entities/student-profile.entity';
import { SchoolCalendar } from '../../school-calendar/entities/school-calendar.entity';
import { SchoolType } from '../../common/enum/school-type.enum';
import { OrganizationSchool } from '../../organization-school/entities/organization-school.entity';

@Entity({ name: 'schools' })
@Index('idx_schools', ['schoolId'])
@Index('idx_schools_code', ['code'], { unique: true }) // ✅ Global unique code
export class School {
  @PrimaryColumn({
    name: 'school_id',
    type: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  schoolId: string;

  @OneToMany(() => OrganizationSchool, (orgSchool) => orgSchool.school)
  organizationSchools: OrganizationSchool[];

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  state?: string;

  @Column({ type: 'text', nullable: true })
  country?: string;

   @Column({ type: 'text', nullable: true })
  town?: string;

  @Column({ type: 'text', nullable: true })
  city?: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ name: 'radius_meters', type: 'int', default: 200 })
  radiusMeters: number;

  @Column({ name: 'contact_person', type: 'text', nullable: true })
  contactPerson?: string;

  @Column({ name: 'contact_phone', type: 'text', nullable: true })
  contactPhone?: string;

  @Column({
    name: 'school_type',
    type: 'enum',
    enum: SchoolType,
    nullable: true,
  })
  schoolType?: SchoolType;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ name: 'attendance_modes', type: 'jsonb', nullable: true })
  attendanceModes?: Record<string, boolean>;

  // ✅ ADDED: Track who created this school (super admin)
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @OneToMany(() => StudentProfile, (student) => student.school)
  students: StudentProfile[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => SchoolCalendar, (calendars) => calendars.school)
  calendars: SchoolCalendar[];

  @OneToMany(() => Class, (cls) => cls.school)
  classes: Class[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
