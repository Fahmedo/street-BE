import { OrganizationStatus } from '../../common/enum/organization-status';
import { OrganizationUser } from '../../organization-user/entities/organization-user.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { School } from '../../school/entities/school.entity';
import { SchoolCalendar } from '../../school-calendar/entities/school-calendar.entity';
import { OrganizationSchool } from '../../organization-school/entities/organization-school.entity';
import { OrganizationStudent } from '../../student-profile/entities/organization_students.entity';

// organization.entity.ts
@Entity('organizations')
export class Organization {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ length: 150, unique: true })
  organizationName: string;

  @Column()
  organizationType: string;

  @Column()
  country: string;

  @Column()
  state: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.PENDING,
  })
  status: OrganizationStatus;

  @Column({ length: 10, unique: true })
  shortCode: string;

  @Column()
  contactName: string;

  @Column({ unique: true })
  contactEmail: string;

  @Column()
  adminName: string;

  @Column({ unique: true })
  adminEmail: string; // kept for reference only, login via OrganizationUser

  @Column({ type: 'jsonb' })
  platformConfiguration: {
    nfcAttendance: boolean;
    photoAttendance: boolean;
    manualEntry: boolean;
    academicPerformanceTracking: boolean;
    weatherInsights: boolean;
    rewardsAndIncentives: boolean;
  };

  // ==================== NEW OPTIONAL FIELDS ====================
  
  @Column({ nullable: true })
  city?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  contactRole?: string;

  @Column({ nullable: true })
  intendedUse?: string; // 'Pilot', 'Full Deployment', 'Research'

  @Column({ type: 'int', nullable: true })
  expectedSchools?: number;

  @Column({ nullable: true })
  expectedStudents?: string; // Can be range like "100-500"

  @Column({ type: 'text', nullable: true })
  additionalNotes?: string;

@Column({ type: 'jsonb', nullable: true, default: [] })
documents?: {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date; 
}[];


  @OneToMany(() => OrganizationUser, (ou) => ou.organization)
  organizationUsers: OrganizationUser[];
  @OneToMany(() => OrganizationSchool, (os) => os.organization)  // ✅ was `any`
  organizationSchools: OrganizationSchool[];

  @OneToMany(() => OrganizationStudent, (os) => os.organization)  
  organizationStudents: OrganizationStudent[];

  @OneToMany(() => SchoolCalendar, (calendar) => calendar.organization)
  calendars: SchoolCalendar[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}