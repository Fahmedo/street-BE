import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrganizationSchoolService } from './organization-school.service';
import { AddSchoolToOrganizationDto } from './dto/create-organization-school.dto';
import { SearchAvailableSchoolsDto } from './dto/search-available-schools.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enum/roles.enum';

@Controller('organizations/:organizationId/schools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationSchoolController {
  constructor(
    private readonly organizationSchoolService: OrganizationSchoolService,
  ) {}

  /**
   * Search available schools to add
   * GET /organizations/:organizationId/schools/available
   */
  @Get('available')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  async searchAvailableSchools(
    @Param('organizationId') organizationId: string,
    @Query() query: SearchAvailableSchoolsDto,
  ) {
    return this.organizationSchoolService.searchAvailableSchools(
      organizationId,
      query,
    );
  }

  /**
   * Get all schools added by this organization
   * GET /organizations/:organizationId/schools
   */
  @Get()
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN, Role.MENTOR)
  async getMyOrganizationSchools(
    @Param('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('searchTerm') searchTerm?: string,
  ) {
    return this.organizationSchoolService.getMyOrganizationSchools(
      organizationId,
      { page, perPage, searchTerm },
    );
  }

  /**
   * Add a school to organization
   * POST /organizations/:organizationId/schools
   */
  @Post()
  @Roles(Role.ORGANIZATION_ADMIN)
  async addSchoolToOrganization(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddSchoolToOrganizationDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.organizationSchoolService.addSchoolToOrganization(
      organizationId,
      dto,
      userId,
    );
  }

  /**
   * Get school details (if org has access)
   * GET /organizations/:organizationId/schools/:schoolId
   */
  @Get(':schoolId')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN, Role.MENTOR)
  async getSchoolDetails(
    @Param('organizationId') organizationId: string,
    @Param('schoolId') schoolId: string,
  ) {
    return this.organizationSchoolService.getSchoolDetails(
      organizationId,
      schoolId,
    );
  }

  /**
   * Remove school from organization
   * DELETE /organizations/:organizationId/schools/:schoolId
   */
  @Delete(':schoolId')
  @Roles(Role.ORGANIZATION_ADMIN)
  async removeSchoolFromOrganization(
    @Param('organizationId') organizationId: string,
    @Param('schoolId') schoolId: string,
  ) {
    return this.organizationSchoolService.removeSchoolFromOrganization(
      organizationId,
      schoolId,
    );
  }
}