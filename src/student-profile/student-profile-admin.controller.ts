import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { StudentProfileService } from './student-profile.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';

@ApiTags('Admin - Students')
@ApiBearerAuth()
@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class StudentProfileAdminController {
  constructor(private readonly studentProfileService: StudentProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Super Admin: Get all students across all organizations',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'firstName', 'lastName'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  findAll(
    @Query()
    query: PaginationQueryDto & {
      schoolId?: string;
      classId?: string;
      gender?: string;
      organizationId?: string;
      isActive?: string;
      sortBy?: string;
      sortOrder?: string;
    },
  ) {
    return this.studentProfileService.findAllGlobal(query);
  }

  @Get('org-schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiOperation({ summary: 'Super Admin: Get schools by organization' })
@ApiQuery({ name: 'organizationId', required: true })
@ApiQuery({ name: 'perPage', required: false })
async getSchoolsByOrg(
  @Query('organizationId') organizationId: string,
  @Query('perPage') perPage = 100,
) {
  return this.studentProfileService.getSchoolsByOrganization(organizationId, perPage);
}
@Get('org-summary')
@ApiOperation({ summary: 'Super Admin: Get student counts grouped by organization' })
getOrgSummary() {
  return this.studentProfileService.getStudentOrgSummary();
}
  @Delete(':studentId')
  @ApiOperation({
    summary: 'Super Admin: Permanently delete a student from global registry',
  })
  async hardDelete(@Param('studentId') studentId: string) {
    return this.studentProfileService.hardDeleteGlobal(studentId);
  }
}
