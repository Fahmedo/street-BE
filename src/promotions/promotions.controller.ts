// src/promotions/promotions.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PromotionsService } from 'src/promotions/promotions.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { BulkPromoteDto } from 'src/promotions/dto/bulk-promote.dto';
import { PromoteStudentDto } from 'src/promotions/dto/promote-student.dto';

@ApiTags('Promotions')
@ApiBearerAuth()
@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZATION_ADMIN)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * Bulk promote — all schools or a specific school
   * POST /promotions/bulk
   */
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk promote students',
    description:
      'Promotes all students across all schools, or just one school if schoolId is provided. ' +
      'Students in terminal classes are marked as graduated instead of promoted.',
  })
  @ApiBody({ type: BulkPromoteDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk promotion completed',
    schema: {
      example: {
        message: 'Bulk promotion completed',
        data: {
          promoted: 120,
          graduated: 18,
          skipped: 3,
          schools: ['Greenfield Primary', 'Sunshine Academy'],
        },
      },
    },
  })
  async bulkPromote(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkPromoteDto,
  ) {
    const result = await this.promotionsService.bulkPromote(
      user.organizationId!,
      user.userId,
      dto,
    );
    return { message: 'Bulk promotion completed', data: result };
  }

  /**
   * Promote a single student
   * POST /promotions/students/:studentId
   */
  @Post('students/:studentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Promote a single student',
    description:
      'Manually promote one student to a specific class, or graduate them by omitting toClassId.',
  })
  @ApiParam({ name: 'studentId', type: 'string', description: 'Student UUID' })
  @ApiBody({ type: PromoteStudentDto })
  @ApiResponse({
    status: 200,
    description: 'Student promoted successfully',
    schema: {
      example: {
        message: 'Student promoted successfully',
        data: {
          studentId: 'uuid',
          fromClass: 'Primary 3A',
          toClass: 'Primary 4A',
          academicYear: '2024/2025',
        },
      },
    },
  })
  async promoteStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() dto: PromoteStudentDto,
  ) {
    const result = await this.promotionsService.promoteStudent(
      user.organizationId!,
      user.userId,
      studentId,
      dto,
    );
    return { message: 'Student promoted successfully', data: result };
  }

  /**
   * Get promotion history — org-wide, school, or student level
   * GET /promotions/history
   */
  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get promotion history',
    description:
      'Returns promotion records. Filter by school or student. Supports pagination.',
  })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Filter by school' })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: 'Filter by student',
  })
  @ApiQuery({ name: 'academicYear', required: false, example: '2024/2025' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Promotion history retrieved successfully',
  })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('schoolId') schoolId?: string,
    @Query('studentId') studentId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('page') page = 1,
    @Query('perPage') perPage = 20,
  ) {
    const result = await this.promotionsService.getHistory(
      user.organizationId!,
      {
        schoolId,
        studentId,
        academicYear,
        page: Number(page),
        perPage: Number(perPage),
      },
    );
    return { message: 'Promotion history retrieved successfully', data: result };
  }

  /**
   * Preview what a bulk promotion would do — dry run
   * GET /promotions/preview
   */
  @Get('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview bulk promotion (dry run)',
    description:
      'Shows what would happen if bulk promotion is run. No data is changed.',
  })
  @ApiQuery({
    name: 'schoolId',
    required: false,
    description: 'Preview for specific school only',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview generated',
    schema: {
      example: {
        message: 'Preview generated',
        data: {
          toBePromoted: 120,
          toBeGraduated: 18,
          withNoNextClass: 3,
          breakdown: [
            { schoolName: 'Greenfield Primary', promoted: 60, graduated: 10 },
          ],
        },
      },
    },
  })
  async previewPromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Query('schoolId') schoolId?: string,
  ) {
    const result = await this.promotionsService.previewPromotion(
      user.organizationId!,
      schoolId,
    );
    return { message: 'Preview generated', data: result };
  }
}