// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/loginDto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  RequestPasswordResetDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';
import { Public } from '../common/decorators/public.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction, Platform } from '../audit/entities/audit-log.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);

    // Must use log() here — no request user yet
    this.auditLogService.log({
      userId: result.user.id,
      organizationId: result.user.organizationId ?? result.user.id,
      action: AuditAction.USER_LOGIN,
      entity: 'User',
      entityId: result.user.id,
      details: `Login: ${result.user.email} (${result.user.roles?.join(', ')})`,
      platform: Platform.WEB,
      userEmail: result.user.email,
      userName: result.user.fullName ?? '',
      organizationName: result.user.organizationName ?? null,
    });

    return result;
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  // ─── SWITCH ROLE ──────────────────────────────────────────────────────────
  @Post('switch-role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active role for users with multiple roles' })
  @ApiResponse({ status: 200, description: 'Role switched successfully' })
  @ApiResponse({
    status: 403,
    description: 'User does not have the requested role',
  })
  async switchRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body('role') role: string,
  ) {
    return this.authService.switchRole(currentUser, role as any);
  }

  // ─── GET PROFILE ──────────────────────────────────────────────────────────
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.getProfile(currentUser);
  }

  // ─── UPDATE PROFILE ───────────────────────────────────────────────────────

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    //console.log('Current user:', currentUser);
    const result = await this.authService.updateProfile(currentUser, dto);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_UPDATED,
      entity: 'User',
      entityId: currentUser.userId,
      details: `Profile updated: ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email,
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  @Get('organization/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization details' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.authService.getOrganization(currentUser, id);
  }

  // ─── UPDATE ORGANIZATION ──────────────────────────────────────────────────

  @Put('organization/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization settings (org admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - org admin role required',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Organization name already in use' })
  async updateOrganization(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const result = await this.authService.updateOrganization(
      currentUser,
      id,
      dto,
    );

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.USER_UPDATED,
      entity: 'Organization',
      entityId: id,
      details: `Organization updated: ${id} by ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email, // ← ADD
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });
    return result;
  }
  // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(currentUser, dto);

    this.auditLogService.log({
      userId: currentUser.userId,
      organizationId: currentUser.organizationId ?? currentUser.userId,
      action: AuditAction.PASSWORD_RESET,
      entity: 'User',
      entityId: currentUser.userId,
      details: `Password changed: ${currentUser.email}`,
      platform: Platform.WEB,
      userEmail: currentUser.email, // ← ADD
      userName: currentUser.fullName ?? '',
      organizationName: currentUser.organizationName ?? null,
    });

    return result;
  }

  // ─── REQUEST PASSWORD RESET ───────────────────────────────────────────────
  @Post('password-reset/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({
    status: 200,
    description: 'Password reset OTP sent (if email exists)',
  })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  // ─── VERIFY RESET OTP ─────────────────────────────────────────────────────
  @Post('password-reset/verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  // ─── RESEND PASSWORD RESET OTP ────────────────────────────────────────────
  @Post('password-reset/resend-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({
    status: 400,
    description: 'Please wait before requesting a new OTP',
  })
  async resendPasswordResetOtp(@Body() dto: RequestPasswordResetDto) {
    return this.authService.resendPasswordResetOtp(dto);
  }
  // ─── RESET PASSWORD ───────────────────────────────────────────────────────
  @Post('password-reset/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);


    return { message: result.message };
  }
}
