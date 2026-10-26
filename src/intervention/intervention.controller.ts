// src/intervention/intervention.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InterventionService } from './intervention.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { InterventionQueryDto } from './dto/intervention-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enum/roles.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/authorization/guards/roles.guard';

import { AuditLogService } from 'src/audit/audit-log.service';


@ApiTags('Interventions')
@ApiBearerAuth()
@Controller('interventions')
@UseGuards(JwtAuthGuard, RolesGuard)  
export class InterventionController {
  constructor(private readonly interventionService: InterventionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Roles(Role.MENTOR, Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new intervention',
    description: 'Log a new intervention for a student',
  })
  @ApiResponse({
    status: 201,
    description: 'Intervention created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async create(
    @Body() dto: CreateInterventionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interventionService.create(dto, user);
  }

  @Get()
  @Roles(Role.MENTOR, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get all interventions',
    description: 'Retrieve interventions with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Interventions retrieved successfully',
  })
  async findAll(
    @Query() query: InterventionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interventionService.findAll(query, user);
  }

  @Get('stats')
  @Roles(Role.MENTOR, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get intervention statistics',
    description: 'Get overview statistics for interventions',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@CurrentUser() user: AuthenticatedUser) {
    return this.interventionService.getStatistics(user);
  }

  // ✅ IMPORTANT: history route must come BEFORE :id route
  @Get('history')
  @Roles(Role.MENTOR)
  @ApiOperation({
    summary: 'Get intervention history and outcomes for logged-in mentor',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'month', required: false, description: 'Format: YYYY-MM' })
  async getHistoryAndOutcomes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    return this.interventionService.getHistoryAndOutcomes(
      user.userId,
      user.organizationId ?? '',
      query,
    );
  }

  @Get(':id')
  @Roles(Role.MENTOR, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Get intervention by ID',
    description: 'Retrieve a specific intervention',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Intervention ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Intervention retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Intervention not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interventionService.findOne(id, user);
  }

  @Put(':id')
  @Roles(Role.MENTOR, Role.ORGANIZATION_ADMIN)
  @ApiOperation({
    summary: 'Update intervention',
    description: 'Update an existing intervention',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Intervention ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Intervention updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Intervention not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only edit own interventions',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInterventionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interventionService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.MENTOR, Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete intervention',
    description: 'Delete an intervention',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Intervention ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Intervention deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Intervention not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own interventions',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interventionService.remove(id, user);
  }
}