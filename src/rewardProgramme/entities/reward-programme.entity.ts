import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entities/organization.entity';
import { RewardIssuance } from './reward-issuance.entity';


@Entity({ name: 'reward_programmes' })
export class RewardProgramme {
  @PrimaryColumn({ name: 'programme_id', type: 'uuid', default: () => 'gen_random_uuid()' })
  programmeId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'programme_type', type: 'enum', enum: ['school', 'family'] })
  type: 'school' | 'family';

  @Column({ type: 'enum', enum: ['active', 'draft', 'paused', 'completed'], default: 'draft' })
  status: 'active' | 'draft' | 'paused' | 'completed';

  @Column({ type: 'enum', enum: ['weekly', 'monthly', 'term'], default: 'monthly' })
  period: 'weekly' | 'monthly' | 'term';

  @Column({ name: 'attendance_threshold', type: 'float', nullable: true })
  attendanceThreshold?: number;

  @Column({ name: 'performance_threshold', type: 'float', nullable: true })
  performanceThreshold?: number;

  @Column({ name: 'improvement_based', type: 'boolean', default: false })
  improvementBased: boolean;

  @Column({ name: 'minimum_data_days', type: 'int', default: 30 })
  minimumDataDays: number;

  @Column({ name: 'reward_type', type: 'enum', enum: ['cash', 'resources', 'certificate', 'other'] })
  rewardType: 'cash' | 'resources' | 'certificate' | 'other';

  @Column({ name: 'reward_value', type: 'text', nullable: true })
  rewardValue?: string;

  @Column({ name: 'reward_description', type: 'text', nullable: true })
  rewardDescription?: string;

  @Column({ name: 'distribution_method', type: 'enum', enum: ['manual', 'automatic'], default: 'manual' })
  distributionMethod: 'manual' | 'automatic';

  @Column({ name: 'eligibility_scope', type: 'enum', enum: ['organisation', 'selected'], default: 'organisation' })
  eligibilityScope: 'organisation' | 'selected';

  @Column({ name: 'budget_cap', type: 'float', nullable: true })
  budgetCap?: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @OneToMany(() => RewardIssuance, (r) => r.programme)
  issuances: RewardIssuance[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}