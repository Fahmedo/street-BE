// src/mentor-overview/mentor-overview.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MentorOverviewService } from './mentor-overview.service';
import { CurrentUser } from '../organization/decorators/current.user.decorators';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../organization/decorators/roles.decorators';
import { OrganizationRole } from '../common/enum/organization-role';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';

@ApiTags('Mentor Overview')
@Controller('mentor/overview')
@Role(OrganizationRole.MENTOR)
@UseGuards(JwtAuthGuard, RolesGuard)
export class MentorOverviewController {
  constructor(private readonly overviewService: MentorOverviewService) {}

  @Get()
  @ApiOperation({ summary: 'Get mentor dashboard overview' })
  @ApiResponse({
    status: 200,
    description: 'Overview retrieved successfully',
    schema: {
      example: {
        message: 'Mentor overview retrieved successfully',
        stats: {
          assignedStudents: 24,
          activeAlerts: 3,
          inProgressInterventions: 5,
          resolvedThisTerm: 12,
        },
        priorityAlerts: [
          {
            id: '1',
            studentId: 'uuid-student-1',
            studentName: 'Aliyu Ibrahim',
            school: 'Community Primary School A',
            schoolId: 'uuid-school-1',
            reason: 'Absent for 3 consecutive days',
            severity: 'high',
            date: '2024-01-24',
            attendanceRate: 45,
          },
        ],
        upcomingFollowUps: [
          {
            id: '1',
            studentId: 'uuid-student-1',
            studentName: 'Aliyu Ibrahim',
            type: 'Home Visit',
            date: '2024-01-25',
            time: '10:00 AM',
            notes: 'Follow up on consecutive absences',
          },
        ],
      },
    },
  })
  async getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.overviewService.getOverview(user.userId, user.organizationId!);
  }
}