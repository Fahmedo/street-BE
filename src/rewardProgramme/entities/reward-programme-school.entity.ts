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

import { RewardProgramme } from './reward-programme.entity'

import { School } from '../../school/entities/school.entity';


@Entity({ name: 'reward_programme_schools' })
export class RewardProgrammeSchool {
  @PrimaryColumn({ name: 'programme_id', type: 'uuid' })
  programmeId: string;

  @PrimaryColumn({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => RewardProgramme, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programme_id' })
  programme: RewardProgramme;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}