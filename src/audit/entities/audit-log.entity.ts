// src/audit/entities/audit-log.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  // Mentor actions
  MENTOR_CREATED = 'Mentor Created',
  MENTOR_UPDATED = 'Mentor Updated',
  MENTOR_SUSPENDED = 'Mentor Suspended',
  MENTOR_ACTIVATED = 'Mentor Activated',
  INVITATION_SENT = 'Invitation Sent',
  INVITATION_RESENT = 'Invitation Resent',
  INTERVENTION_UPDATED = 'Intervention Updated',
  INTERVENTION_CREATED = 'Intervention Created',
  INTERVENTION_DELETED = 'Intervention Deleted',

  // Assignment actions
  SCHOOL_ASSIGNED = 'School Assigned',
  SCHOOL_UNASSIGNED = 'School Unassigned',
  CLASS_ASSIGNED = 'Class Assigned',
  CLASS_UNASSIGNED = 'Class Unassigned',
  STUDENT_ASSIGNED = 'Student Assigned',
  STUDENT_UNASSIGNED = 'Student Unassigned',
  ASSIGNMENT_REMOVED = 'Assignment Removed',

  // Auth actions
  USER_LOGIN = 'User Login',
  PASSWORD_RESET = 'Password Reset',

  // User actions
  USER_CREATED = 'User Created',
  USER_UPDATED = 'User Updated',
  USER_DELETED = 'User Deleted',
  ADMIN_SUSPENDED = 'Admin Suspended',
  USER_ACTIVATED = 'User Activated',
  USER_SUSPENDED = 'User Suspended',
  ORG_ACTIVATED = 'Organisation Activated', // ← ADD
  ORG_SUSPENDED = 'Organisation Suspended', // ← ADD
  ORG_CREATED = 'Organisation Created', // ← ADD
  ORG_DELETED = 'Organisation Deleted',

  /////////////////reward
  REWARD_ISSUED = 'Reward Issued',
  REWARD_APPROVED = 'Reward Approved',
  REWARD_CANCELLED = 'Reward Cancelled',
  REWARD_UPDATED = 'Reward Updated',
  REWARD_PROGRAMME_CREATED = 'Reward Program Created',

  ///////////school

  SCHOOL_CREATED = 'School Created',
  SCHOOL_UPDATED = 'School Updated',
  SCHOOL_ACTIVATED = 'School Activated',
  SCHOOL_DEACTIVATED = 'School Deactivated',
  SCHOOL_DELETED = 'School Deleted',
  // Generic action for flexibility

  //calendar
  CALENDAR_CREATED = 'Calendar Created',
  CALENDAR_SET_CURRENT = 'Calendar Set Current',
  CALENDAR_DELETED = 'Calendar Deleted',

  /////classs
  CLASS_CREATED = 'Class Created',
  CLASS_DELETED = 'Class Deleted',
  // att
  ATTENDANCE_DELETED = 'Attendance Deleted',

  ////
  STUDENT_CREATED = 'Student Created',
STUDENT_UPDATED = 'Student Updated',
STUDENT_DELETED = 'Student Deleted',

  OTHER = 'Other',
}

export enum Platform {
  WEB = 'Web',
  MOBILE = 'Mobile',
  API = 'API',
}

@Entity('audit_logs')
@Index('idx_audit_user', ['userId'])
@Index('idx_audit_org', ['organizationId'])
@Index('idx_audit_entity', ['entity', 'entityId'])
@Index('idx_audit_timestamp', ['timestamp'])
export class AuditLog {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_email', type: 'varchar', length: 255, nullable: true })
  userEmail?: string;

  @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
  userName?: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 }) // Changed from enum to varchar for flexibility
  action: string;

  @Column({ type: 'varchar', length: 100 })
  entity: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'text' })
  details: string;

  @Column({
    type: 'enum',
    enum: Platform,
    default: Platform.WEB,
  })
  platform: Platform;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
  @Column({
    name: 'organization_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  organizationName?: string | null;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp: Date;
}
