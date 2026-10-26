// src/organization-user/entities/organization-user-school.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OrganizationUser } from './organization-user.entity';
import { School } from '../../school/entities/school.entity';

@Entity('organization_user_schools')
export class OrganizationUserSchool {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  schoolId: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean; // ← marks the user's main school

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => OrganizationUser, (user) => user.schoolAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: OrganizationUser;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school: School;
}