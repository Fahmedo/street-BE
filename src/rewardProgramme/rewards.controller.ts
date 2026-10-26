import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { CreateIssuanceDto } from './dto/create-issuance.dto';
import { UpdateIssuanceDto } from './dto/update-issuance.dto';
import { QueryProgrammesDto, QueryIssuancesDto } from './dto/query-rewards.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateSettingsDto } from './dto/reward-settings.dto';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Role } from 'src/common/enum/roles.enum';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuditAction, Platform } from 'src/audit/entities/audit-log.entity';

@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /rewards/dashboard
   * Returns aggregate stats, active programmes, and recent issuances.
   */
  @Get('dashboard')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.getDashboard(user.organizationId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRAMMES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /rewards/programmes
   * Create a new reward programme (draft by default).
   */
  @Post('programmes')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createProgramme(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProgrammeDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    const result = await this.rewardsService.createProgramme(
      user.organizationId,
      dto,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: AuditAction.REWARD_PROGRAMME_CREATED,
      entity: 'RewardProgramme',
      entityId: (result as any)?.id,
      details: `Reward programme created: ${dto.name} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  /**
   * GET /rewards/programmes
   * List programmes with optional filters (status, type, searchTerm) + pagination.
   */
  @Get('programmes')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  getProgrammes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryProgrammesDto,
  ) {
    if (!user.organizationId) {
      console.error('❌ Missing organizationId in user context');
      throw new BadRequestException('Organization context required');
    }

    const result = this.rewardsService.getProgrammes(
      user.organizationId,
      query,
    );

    return result;
  }

  /**
   * GET /rewards/programmes/:programmeId
   * Get full details of a single programme including school links.
   */
  @Get('programmes/:programmeId')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  getProgrammeById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programmeId', ParseUUIDPipe) programmeId: string,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.getProgrammeById(
      user.organizationId,
      programmeId,
    );
  }

  @Get('settings')
  @Roles(Role.ORGANIZATION_ADMIN)
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.getSettings(user.organizationId);
  }

  @Patch('settings')
  @Roles(Role.ORGANIZATION_ADMIN)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.updateSettings(user.organizationId, dto);
  }
  /**
   * PATCH /rewards/programmes/:programmeId
   * Update a programme (including changing status to active/paused/completed).
   */
  @Patch('programmes/:programmeId')
  @Roles(Role.ORGANIZATION_ADMIN)
  async updateProgramme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programmeId', ParseUUIDPipe) programmeId: string,
    @Body() dto: UpdateProgrammeDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    const result = await this.rewardsService.updateProgramme(
      user.organizationId,
      programmeId,
      dto,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: AuditAction.REWARD_UPDATED,
      entity: 'RewardProgramme',
      entityId: programmeId,
      details: `Reward programme updated: ${programmeId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  /**
   * DELETE /rewards/programmes/:programmeId
   * Delete a programme (only allowed for draft programmes in practice).
   */
  @Delete('programmes/:programmeId')
  @Roles(Role.ORGANIZATION_ADMIN)
  async deleteProgramme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('programmeId', ParseUUIDPipe) programmeId: string,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    const result = await this.rewardsService.deleteProgramme(
      user.organizationId,
      programmeId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: AuditAction.USER_DELETED,
      entity: 'RewardProgramme',
      entityId: programmeId,
      details: `Reward programme deleted: ${programmeId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ELIGIBILITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /rewards/eligibility/schools
   * Returns schools with their eligibility status across active school programmes.
   * Optional ?programmeId= to scope to one programme.
   */
  @Get('eligibility/schools')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  getEligibleSchools(
    @CurrentUser() user: AuthenticatedUser,
    @Query('programmeId') programmeId?: string,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.getEligibleSchools(
      user.organizationId,
      programmeId,
    );
  }

  /**
   * GET /rewards/eligibility/families
   * Returns students/families with their eligibility status across active family programmes.
   * Optional ?programmeId= to scope to one programme.
   */
  @Get('eligibility/families')
  @Roles(Role.ORGANIZATION_ADMIN)
  getEligibleFamilies(
    @CurrentUser() user: AuthenticatedUser,
    @Query('programmeId') programmeId?: string,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.getEligibleFamilies(
      user.organizationId,
      programmeId,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ISSUANCES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /rewards/issuances
   * Create a reward issuance record (pending by default unless programme is automatic).
   */
  @Post('issuances')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createIssuance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIssuanceDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    const result = await this.rewardsService.createIssuance(
      user.organizationId,
      dto,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: AuditAction.REWARD_ISSUED,
      entity: 'RewardIssuance',
      entityId: (result as any)?.id,
      details: `Reward issued by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  /**
   * GET /rewards/issuances
   * List issuances with optional filters (programmeId, status, recipientType, etc.) + pagination.
   */
  @Get('issuances')
  @Roles(Role.ORGANIZATION_ADMIN, Role.SCHOOL_ADMIN)
  getIssuances(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryIssuancesDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.getIssuances(user.organizationId, query);
  }

  /**
   * PATCH /rewards/issuances/:issuanceId
   * Update an issuance (e.g. set outcomeChange after the following period).
   */
  @Patch('issuances/:issuanceId')
  @Roles(Role.ORGANIZATION_ADMIN)
  async updateIssuance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('issuanceId', ParseUUIDPipe) issuanceId: string,
    @Body() dto: UpdateIssuanceDto,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    return this.rewardsService.updateIssuance(
      user.organizationId,
      issuanceId,
      dto,
    );
  }

  /**
   * POST /rewards/issuances/:issuanceId/approve
   * Approve a pending issuance. Sets status → approved, records approver + timestamp.
   */
  @Post('issuances/:issuanceId/approve')
  async approveIssuance(
    @CurrentUser() user: AuthenticatedUser, // ← was AuthenticatedUser
    @Param('issuanceId', ParseUUIDPipe) issuanceId: string,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    const result = await this.rewardsService.approveIssuance(
      user.organizationId,
      issuanceId,
      user.userId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: AuditAction.REWARD_APPROVED,
      entity: 'RewardIssuance',
      entityId: issuanceId,
      details: `Reward issuance approved: ${issuanceId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }

  /**
   * POST /rewards/issuances/:issuanceId/cancel
   * Cancel a pending or approved issuance. Issued rewards cannot be cancelled.
   */
  @Post('issuances/:issuanceId/cancel')
  @Roles(Role.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelIssuance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('issuanceId', ParseUUIDPipe) issuanceId: string,
  ) {
    if (!user.organizationId)
      throw new BadRequestException('Organization context required');
    const result = await this.rewardsService.cancelIssuance(
      user.organizationId,
      issuanceId,
    );

    this.auditLogService.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: AuditAction.REWARD_CANCELLED,
      entity: 'RewardIssuance',
      entityId: issuanceId,
      details: `Reward issuance cancelled: ${issuanceId} by ${user.email}`,
      platform: Platform.WEB,
      userEmail: user.email,
      userName: user.fullName ?? '',
      organizationName: user.organizationName ?? null,
    });

    return result;
  }
}
