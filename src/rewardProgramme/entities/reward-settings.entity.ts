// src/rewards/entities/reward-settings.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reward_settings')
export class RewardSettings {
  @PrimaryColumn({ name: 'programme_id', type: 'uuid', default: () => 'gen_random_uuid()' })
  settingsId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // Programme Safeguards
  @Column({ name: 'max_rewards_per_period', type: 'int', default: 200 })
  maxRewardsPerPeriod: number;

  @Column({ name: 'budget_cap', type: 'decimal', precision: 10, scale: 2, nullable: true })
  budgetCap: number;

  @Column({ name: 'approval_workflow', type: 'varchar', default: 'manual' })
  approvalWorkflow: string; // 'manual' | 'automatic'

  @Column({ name: 'minimum_data_days', type: 'int', default: 30 })
  minimumDataDays: number;

  // Audit Features (always enabled, stored for logging)
  @Column({ name: 'audit_trail_enabled', type: 'boolean', default: true })
  auditTrailEnabled: boolean;

  @Column({ name: 'no_retroactive_changes', type: 'boolean', default: true })
  noRetroactiveChanges: boolean;

  @Column({ name: 'conflict_warnings_enabled', type: 'boolean', default: true })
  conflictWarningsEnabled: boolean;

  // Notification Preferences
  @Column({ name: 'notify_new_eligible', type: 'boolean', default: true })
  notifyNewEligible: boolean;

  @Column({ name: 'weekly_summary', type: 'boolean', default: true })
  weeklySummary: boolean;

  @Column({ name: 'budget_alerts', type: 'boolean', default: false })
  budgetAlerts: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}