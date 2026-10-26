// src/mentor-overview/dto/mentor-overview.dto.ts

import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MentorOverviewQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  perPage?: number;
}

// ─── RESPONSE DTOs ───────────────────────────────────────────────────────

export interface MentorOverviewStatsDto {
  assignedStudents: number;
  activeAlerts: number;
  inProgressInterventions: number;
  resolvedThisTerm: number;
}

export interface PriorityAlertDto {
  id: string;
  studentId: string;
  studentName: string;
  school: string;
  schoolId: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  date: string;
  attendanceRate: number;
}

export interface UpcomingFollowUpDto {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  date: string;
  time: string;
  notes?: string;
}

export interface MentorOverviewResponseDto {
  message: string;
  stats: MentorOverviewStatsDto;
  priorityAlerts: PriorityAlertDto[];
  upcomingFollowUps: UpcomingFollowUpDto[];
}