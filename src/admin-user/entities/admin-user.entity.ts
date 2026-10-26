// src/admin-user/entities/admin-user.entity.ts
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { Role } from '../../common/enum/roles.enum';
import { AdminUserStatus } from '../../common/enum/admin-user-status';
@Entity('admin_users')
export class AdminUser {
    @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
    id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string; 
  
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 255 , select: true })
  password: string;

  @Column({ type: 'simple-array' })
  roles: Role[];

@Column({ 
  type: 'enum', 
  enum: AdminUserStatus,
  default: AdminUserStatus.ACTIVE 
})
status: AdminUserStatus;

  // Password Management Fields
  @Column({ type: 'varchar', length: 6, nullable: true })
  passwordResetCode?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetCodeExpiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}