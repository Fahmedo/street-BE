import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { School } from '../../school/entities/school.entity';
import { Organization } from '../../organization/entities/organization.entity'; // Add this import

@Entity({ name: 'school_calendar' })
@Index('idx_school_calendar_school', ['schoolId'])
@Index('idx_school_calendar_org', ['orgId']) // ✅ NEW: Index on orgId
@Index('idx_unique_school_term', ['schoolId', 'academicYear', 'termName'], { unique: true })
@Index('idx_calendar_current', ['schoolId', 'isCurrent'])
@Index('idx_org_calendar', ['orgId', 'academicYear']) // ✅ NEW: Composite index for org-wide queries
export class SchoolCalendar {
  @PrimaryColumn({
    name: 'calendar_id',
    type: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  calendarId: string;

  // ✅ NEW: Organization ID
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  // ✅ NEW: Relationship to Organization
  @ManyToOne(() => Organization, (org) => org.calendars, {
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @ManyToOne(() => School, (school) => school.calendars, {
    onDelete: 'CASCADE',
  })
  school: School;

  // Academic year
  @Column({ name: 'academic_year', type: 'varchar', length: 20 })
  academicYear: string; // e.g., "2024/2025"

  @Column({ name: 'term_name', type: 'text' })
  termName: string; // e.g., "First Term", "Spring Term"

  // Term order for sequencing
  @Column({ name: 'term_order', type: 'int', nullable: true })
  termOrder?: number; // 1, 2, 3, etc.

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  // Only ONE term can be current per school
  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  // Status field
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'draft' | 'active' | 'completed' | 'archived';

  // Description field
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  // Holidays structure
  @Column({ name: 'holidays', type: 'jsonb', nullable: true })
  holidays?: Array<{
    name: string;
    startDate: string;
    endDate: string;
    type?: 'mid_term' | 'public_holiday' | 'exam_period';
  }>;

  // Generic metadata for future flexibility
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}