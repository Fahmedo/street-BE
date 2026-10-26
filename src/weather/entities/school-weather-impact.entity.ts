// src/weather/entities/school-weather-impact.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,PrimaryColumn
} from 'typeorm';
import { School } from '../../school/entities/school.entity';

@Entity('school_weather_impacts')
@Index(['schoolId', 'impactDate'])
export class SchoolWeatherImpact {
@PrimaryColumn({name: 'impact_id', type: 'uuid', default: () => 'gen_random_uuid()' })
  impactId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'impact_date', type: 'date' })
  impactDate: Date;

  // Weather event details
  @Column({ name: 'weather_event', type: 'varchar', length: 100 })
  weatherEvent: string; // 'Heavy Rainfall', 'Storm', 'Flooding'

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  severity: 'low' | 'medium' | 'high';

  @Column({ name: 'rainfall_mm', type: 'decimal', precision: 6, scale: 2 })
  rainfallMm: number;

  @Column({ name: 'days_affected', type: 'int', default: 1 })
  daysAffected: number;

  // Impact metrics
  @Column({ name: 'attendance_rate_normal', type: 'decimal', precision: 5, scale: 2, nullable: true })
  attendanceRateNormal: number; // Average attendance before event

  @Column({ name: 'attendance_rate_during', type: 'decimal', precision: 5, scale: 2, nullable: true })
  attendanceRateDuring: number; // Attendance during event

  @Column({ name: 'attendance_change_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  attendanceChangePercent: number; // Calculated difference

  @Column({ name: 'students_affected', type: 'int', nullable: true })
  studentsAffected: number;

  @Column({ name: 'performance_impact', type: 'varchar', length: 50, nullable: true })
  performanceImpact: string; // 'None', 'Minimal', 'Moderate', 'Significant'

  // Notes
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken: string; // What the school did to mitigate

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}