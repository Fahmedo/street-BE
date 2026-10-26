// organization-school.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { School } from '../../school/entities/school.entity';
import { Organization } from '../../organization/entities/organization.entity';

@Entity('organization_schools')
@Index('idx_org_school_composite', ['organizationId', 'schoolId'], {
  unique: true,
})
export class OrganizationSchool {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => Organization, (org) => org.organizationSchools, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => School, (school) => school.organizationSchools, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'school_id' })
  school: School;

  // ==================== MINIMAL FIELDS ====================

  @Column({ name: 'added_by_user_id', type: 'uuid', nullable: true })
  addedByUserId?: string; // Which org admin added this school

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean; // Org can remove/deactivate school from their list

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date; // When org added this school

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
