// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as moment from 'moment';
import { Role } from '../common/enum/roles.enum';
import {
  JwtPayload,
  AuthenticatedUser,
} from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/loginDto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  RequestPasswordResetDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';
import { OrganizationStatus } from 'src/common/enum/organization-status';
import { AdminUserStatus } from 'src/common/enum/admin-user-status';
// Import all your user entities
import { AdminUser } from '../admin-user/entities/admin-user.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { School } from 'src/school/entities/school.entity';
import { EmailService } from 'src/config/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,

    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,

    @InjectRepository(OrganizationUser)
    private readonly orgUserRepo: Repository<OrganizationUser>,

    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,

    @InjectRepository(School)
    private schoolRepo: Repository<School>,
    private readonly emailService: EmailService,
  ) {}

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  // ─── LOGIN ────────────────────────────────────────────────────────────────
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Check admin users
    const adminUser = await this.adminUserRepo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'roles',
        'status',
      ],
    });

    if (adminUser) {
      if (adminUser.status === AdminUserStatus.SUSPENDED) {
        throw new UnauthorizedException('Account has been suspended');
      }

      if (adminUser.status === AdminUserStatus.PENDING) {
        throw new UnauthorizedException('Account is pending activation');
      }

      await this.verifyPassword(password, adminUser.password);

      adminUser.lastLogin = new Date();
      await this.adminUserRepo.save(adminUser);

      return this.generateTokens({
        sub: adminUser.id,
        email: adminUser.email,
        roles: adminUser.roles,
        role: adminUser.roles[0],
        organizationId: null,
        schoolId: null,
        tenantId: null,
        fullName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        organizationName: 'Ahyel Super Admin',
      });
    }

    // 2. Check organization users
    const orgUser = await this.orgUserRepo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'roles',
        'organizationId',
        'schoolId',
        'status',
      ],
    });

    if (orgUser) {
      // ✅ Check organization status
      let organization: InstanceType<typeof Organization> | null = null;
      if (orgUser.organizationId) {
        organization = await this.organizationRepo.findOne({
          where: { id: orgUser.organizationId },
          //select: ['id', 'status','organizationName'],
        });

        if (organization) {
          if (organization.status === OrganizationStatus.SUSPENDED) {
            throw new UnauthorizedException(
              'Your organization has been suspended. Please contact your administrator or support for assistance.',
            );
          }

          if (organization.status === OrganizationStatus.PENDING) {
            throw new UnauthorizedException(
              'Your organization registration is pending approval. You will be notified once it is activated.',
            );
          }
        }
      }

      // ✅ Check user account status
      if (orgUser.status === OrganizationStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your account has been suspended. Please contact your organization administrator.',
        );
      }

      if (orgUser.status === OrganizationStatus.PENDING) {
        throw new UnauthorizedException(
          'Your account is pending activation. Please contact your organization administrator.',
        );
      }

      // ✅ UPDATED: Check school status with role hierarchy
      // Organization-level roles bypass school activation check
      const orgLevelRoles = [Role.ORGANIZATION_ADMIN, Role.SUPER_ADMIN];
      const hasOrgLevelRole = orgUser.roles.some((role) =>
        orgLevelRoles.includes(role),
      );

      // Only enforce school activation for school-level roles WITHOUT org-level access
      if (!hasOrgLevelRole) {
        const schoolRelatedRoles = [Role.SCHOOL_ADMIN];
        const hasSchoolRole = orgUser.roles.some((role) =>
          schoolRelatedRoles.includes(role),
        );

        if (hasSchoolRole && orgUser.schoolId) {
          const school = await this.schoolRepo.findOne({
            where: { schoolId: orgUser.schoolId },
            select: ['schoolId', 'isActive', 'name'],
          });

          if (school) {
            if (!school.isActive) {
              throw new UnauthorizedException(
                `Access denied. The school "${school.name}" has been deactivated. Please contact your organization administrator for assistance.`,
              );
            }
          } else {
            throw new UnauthorizedException(
              'Your assigned school could not be found. Please contact your organization administrator.',
            );
          }
        }
      }

      // Verify password
      await this.verifyPassword(password, orgUser.password);

      // Update last login
      orgUser.lastLogin = new Date();
      await this.orgUserRepo.save(orgUser);

      return this.generateTokens({
        sub: orgUser.id,
        email: orgUser.email,
        role: orgUser.roles[0],
        roles: orgUser.roles,
        organizationId: orgUser.organizationId,
        schoolId: orgUser.schoolId,
        tenantId: orgUser.organizationId,
        fullName: `${orgUser.firstName} ${orgUser.lastName}`.trim(),
        organizationName: organization?.organizationName ?? null,
      });
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  // ─── GET PROFILE ──────────────────────────────────────────────────────────
  async getProfile(currentUser: AuthenticatedUser) {
    // Check if user is admin
    if (currentUser.roles.includes(Role.SUPER_ADMIN)) {
      const user = await this.adminUserRepo.findOne({
        where: { id: currentUser.userId },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'phoneNumber',
          'address',
          'roles',
          'status',
          'createdAt',
          'lastLogin',
          'passwordChangedAt',
        ],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phoneNumber: user.phoneNumber,
        address: user.address,
        roles: user.roles,
        role: currentUser.role,
        status: user.status,
        userType: 'admin',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        passwordChangedAt: user.passwordChangedAt,
      };
    } else {
      // Organization user
      const user = await this.orgUserRepo.findOne({
        where: { id: currentUser.userId },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'phoneNumber',
          'address',
          'roles',
          'status',
          'organizationId',
          'schoolId',
          'createdAt',
          'lastLogin',
          'passwordChangedAt',
        ],
        relations: ['organization', 'school'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phoneNumber: user.phoneNumber,
        address: user.address,
        roles: user.roles,
        role: currentUser.role,
        status: user.status,
        userType: 'organization',
        organizationId: user.organizationId,
        schoolId: user.schoolId,
        organization: user.organization
          ? {
              id: user.organization.id,
              name: user.organization.organizationName,
            }
          : null,
        school: user.school
          ? {
              id: user.school.schoolId,
              name: user.school.name,
            }
          : null,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        passwordChangedAt: user.passwordChangedAt,
      };
    }
  }
  // ─── SWITCH ROLE ──────────────────────────────────────────────────────────
  async switchRole(currentUser: AuthenticatedUser, newRole: Role) {
    // Verify user actually has this role
    if (!currentUser.roles.includes(newRole)) {
      throw new ForbiddenException('You do not have this role');
    }

    // Re-issue tokens with new active role
    return this.generateTokens({
      sub: currentUser.userId,
      email: currentUser.email,
      role: newRole,
      roles: currentUser.roles,
      organizationId: currentUser.organizationId,
      schoolId: currentUser.schoolId,
      tenantId: currentUser.tenantId,
      fullName: currentUser.fullName,
      organizationName: currentUser.organizationName ?? null,
    });
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      // Re-issue access token with same claims
      const accessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          roles: payload.roles,
          organizationId: payload.organizationId,
          schoolId: payload.schoolId,
          tenantId: payload.tenantId,
          fullName: payload.fullName,
          organizationName: payload.organizationName ?? null,
        },
        { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '30m' },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── UPDATE PROFILE ───────────────────────────────────────────────────────
  async updateProfile(currentUser: AuthenticatedUser, dto: UpdateProfileDto) {
    // Check if email is being changed and if it's already in use
    if (dto.email && dto.email !== currentUser.email) {
      const emailInUse = await this.checkEmailExists(dto.email);
      if (emailInUse) {
        throw new ConflictException('Email address is already in use');
      }
    }

    // Update based on user type
    if (currentUser.roles.includes(Role.SUPER_ADMIN)) {
      const user = await this.adminUserRepo.findOne({
        where: { id: currentUser.userId },
      });
      if (!user) throw new NotFoundException('User not found');

      Object.assign(user, {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.address !== undefined && { address: dto.address }),
      });

      await this.adminUserRepo.save(user);

      // Generate new tokens with updated info
      return this.generateTokens({
        sub: user.id,
        email: user.email,
        roles: user.roles,
        role: currentUser.role,
        organizationId: null,
        schoolId: null,
        tenantId: null,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'Ahyel Super Admin',
      });
    } else {
      const user = await this.orgUserRepo.findOne({
        where: { id: currentUser.userId },
      });
      if (!user) throw new NotFoundException('User not found');

      Object.assign(user, {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.address !== undefined && { address: dto.address }),
      });

      await this.orgUserRepo.save(user);

      // Generate new tokens with updated info
      return this.generateTokens({
        sub: user.id,
        email: user.email,
        role: currentUser.role,
        roles: user.roles,
        organizationId: user.organizationId,
        schoolId: user.schoolId,
        tenantId: user.organizationId,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: currentUser.organizationName ?? null,
      });
    }
  }

  // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────
  async changePassword(currentUser: AuthenticatedUser, dto: ChangePasswordDto) {
    // Validate passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Prevent same password
    const samePassword = await bcrypt.compare(
      dto.newPassword,
      await this.getCurrentUserPassword(currentUser),
    );
    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Update password based on user type
    if (currentUser.roles.includes(Role.SUPER_ADMIN)) {
      const user = await this.adminUserRepo.findOne({
        where: { id: currentUser.userId },
      });
      if (!user) throw new NotFoundException('User not found');

      // Verify current password
      await this.verifyPassword(dto.currentPassword, user.password);

      // Update password
      user.password = await this.hashPassword(dto.newPassword);
      user.passwordChangedAt = new Date();
      await this.adminUserRepo.save(user);

      await this.emailService.sendPasswordChangedEmail({
        to: user.email,
        firstName: user.firstName,
      });
    } else {
      const user = await this.orgUserRepo.findOne({
        where: { id: currentUser.userId },
      });
      if (!user) throw new NotFoundException('User not found');

      // Verify current password
      await this.verifyPassword(dto.currentPassword, user.password);

      // Update password
      user.password = await this.hashPassword(dto.newPassword);
      user.passwordChangedAt = new Date();
      await this.orgUserRepo.save(user);
      await this.emailService.sendPasswordChangedEmail({
        to: user.email,
        firstName: user.firstName,
      });
    }

    return {
      message:
        'Password changed successfully. Please login with your new password.',
    };
  }

  // ─── REQUEST PASSWORD RESET ───────────────────────────────────────────────
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    // Check admin users first
    const adminUser = await this.adminUserRepo.findOne({
      where: { email: dto.email },
    });

    if (adminUser) {
      // Generate OTP
      const otp = this.generateOTP();
      adminUser.passwordResetCode = otp;
      adminUser.passwordResetCodeExpiresAt = moment()
        .add(10, 'minutes')
        .toDate();
      await this.adminUserRepo.save(adminUser);

      await this.emailService.sendPasswordResetOtp({
        to: dto.email,
        firstName: adminUser.firstName,
        otp: otp,
      });

      return {
        message:
          'If an account with that email exists, a password reset code has been sent.',
        // Remove in production:
        // otp,
      };
    }

    // Check organization users
    const orgUser = await this.orgUserRepo.findOne({
      where: { email: dto.email },
    });

    if (orgUser) {
      // Generate OTP
      const otp = this.generateOTP();
      orgUser.passwordResetCode = otp;
      orgUser.passwordResetCodeExpiresAt = moment().add(10, 'minutes').toDate();
      await this.orgUserRepo.save(orgUser);

      // TODO: Send email with OTP
      await this.emailService.sendPasswordResetOtp({
        to: dto.email,
        firstName: orgUser.firstName,
        otp: otp,
      });

      return {
        message:
          'If an account with that email exists, a password reset code has been sent.',
        // Remove in production:
        //otp,
      };
    }

    // Don't reveal if email exists for security
    return {
      message:
        'If an account with that email exists, a password reset code has been sent.',
    };
  }

  // ─── VERIFY RESET OTP ─────────────────────────────────────────────────────
  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const { user } = await this.findUserByEmailWithResetCode(dto.email);

    if (!user.passwordResetCode || user.passwordResetCode !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('OTP code has expired');
    }

    return { message: 'OTP verified successfully' };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    // Validate passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const { user, isAdmin } = await this.findUserByEmailWithResetCode(
      dto.email,
    );

    if (!user.passwordResetCode || user.passwordResetCode !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('OTP code has expired');
    }

    // Update password
    user.password = await this.hashPassword(dto.newPassword);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresAt = undefined;
    user.passwordChangedAt = new Date();

    if (user instanceof AdminUser) {
      await this.adminUserRepo.save(user);
    } else if (user instanceof OrganizationUser) {
      await this.orgUserRepo.save(user);
    } else {
      throw new Error('Unknown user type');
    }
    await this.emailService.sendPasswordResetConfirmationEmail({
      to: user.email,
      firstName: user.firstName,
    });
    return {
      message:
        'Password reset successfully. You can now login with your new password.',
      _audit: {
        userId: user.id,
        organizationId:
          user instanceof OrganizationUser ? user.organizationId : user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        organizationName:
          user instanceof OrganizationUser && user.organizationId
            ? ((
                await this.organizationRepo.findOne({
                  where: { id: user.organizationId },
                })
              )?.organizationName ?? null)
            : null,
      },
    };
  }
  // ─── RESEND PASSWORD RESET OTP ────────────────────────────────────────────
  async resendPasswordResetOtp(dto: RequestPasswordResetDto) {
    // Check admin users first
    const adminUser = await this.adminUserRepo.findOne({
      where: { email: dto.email },
    });

    if (adminUser) {
      // Optional cooldown: prevent spamming (60 seconds)
      if (adminUser.passwordResetCodeExpiresAt) {
        const expiresAt = adminUser.passwordResetCodeExpiresAt;
        const cooldownEnd = moment(expiresAt).subtract(9, 'minutes').toDate(); // 1 min after last send
        if (new Date() < cooldownEnd) {
          throw new BadRequestException(
            'Please wait at least 1 minute before requesting a new OTP.',
          );
        }
      }

      const otp = this.generateOTP();
      adminUser.passwordResetCode = otp;
      adminUser.passwordResetCodeExpiresAt = moment()
        .add(10, 'minutes')
        .toDate();
      await this.adminUserRepo.save(adminUser);

      await this.emailService.sendPasswordResetOtp({
        to: dto.email,
        firstName: adminUser.firstName,
        otp,
      });

      return {
        message: 'A new OTP has been sent to your email address.',
      };
    }

    // Check organization users
    const orgUser = await this.orgUserRepo.findOne({
      where: { email: dto.email },
    });

    if (orgUser) {
      // Optional cooldown: prevent spamming (60 seconds)
      if (orgUser.passwordResetCodeExpiresAt) {
        const cooldownEnd = moment(orgUser.passwordResetCodeExpiresAt)
          .subtract(9, 'minutes')
          .toDate();
        if (new Date() < cooldownEnd) {
          throw new BadRequestException(
            'Please wait at least 1 minute before requesting a new OTP.',
          );
        }
      }

      const otp = this.generateOTP();
      orgUser.passwordResetCode = otp;
      orgUser.passwordResetCodeExpiresAt = moment().add(10, 'minutes').toDate();
      await this.orgUserRepo.save(orgUser);

      await this.emailService.sendPasswordResetOtp({
        to: dto.email,
        firstName: orgUser.firstName,
        otp,
      });

      return {
        message: 'A new OTP has been sent to your email address.',
      };
    }

    // Don't reveal if email exists
    return {
      message: 'If an account with that email exists, a new OTP has been sent.',
    };
  }
  // ─── HELPER METHODS ───────────────────────────────────────────────────────
  private async verifyPassword(plain: string, hashed: string) {
    const isMatch = await bcrypt.compare(plain, hashed);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async getCurrentUserPassword(
    currentUser: AuthenticatedUser,
  ): Promise<string> {
    if (currentUser.roles.includes(Role.SUPER_ADMIN)) {
      const user = await this.adminUserRepo.findOne({
        where: { id: currentUser.userId },
        select: ['password'],
      });
      return user?.password || '';
    } else {
      const user = await this.orgUserRepo.findOne({
        where: { id: currentUser.userId },
        select: ['password'],
      });
      return user?.password || '';
    }
  }

  private async checkEmailExists(email: string): Promise<boolean> {
    const adminExists = await this.adminUserRepo.findOne({ where: { email } });
    if (adminExists) return true;

    const orgExists = await this.orgUserRepo.findOne({ where: { email } });
    return !!orgExists;
  }

  private async findUserByEmailWithResetCode(
    email: string,
  ): Promise<{ user: AdminUser | OrganizationUser; isAdmin: boolean }> {
    const adminUser = await this.adminUserRepo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'password',
        'passwordResetCode',
        'passwordResetCodeExpiresAt',
        'passwordChangedAt',
      ],
    });

    if (adminUser) {
      return { user: adminUser, isAdmin: true };
    }

    const orgUser = await this.orgUserRepo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'passwordResetCode',
        'passwordResetCodeExpiresAt',
        'passwordChangedAt',
      ],
    });

    if (!orgUser) {
      throw new NotFoundException('User not found');
    }

    return { user: orgUser, isAdmin: false };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.ACCESS_TOKEN_SECRET,
      expiresIn: '30m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        roles: payload.roles,
        organizationId: payload.organizationId,
        schoolId: payload.schoolId,
        fullName: payload.fullName ?? null,
        organizationName: payload.organizationName ?? null,
      },
    };
  }

  async getOrganization(
    currentUser: AuthenticatedUser,
    organizationId: string,
  ) {
    // Verify the requester belongs to this org
    if (currentUser.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // ─── UPDATE ORGANIZATION ──────────────────────────────────────────────────
  async updateOrganization(
    currentUser: AuthenticatedUser,
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) {
    // Must belong to org
    if (currentUser.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    // Role check — only ORG_ADMIN may update
    const orgAdminRoles: Role[] = [Role.ORGANIZATION_ADMIN]; // adjust to your actual enum value
    if (!currentUser.roles.some((r) => orgAdminRoles.includes(r))) {
      throw new ForbiddenException(
        'Only organization admins can update organization settings',
      );
    }

    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    // Check name uniqueness if changing
    if (dto.organizationName && dto.organizationName !== org.organizationName) {
      const exists = await this.organizationRepo.findOne({
        where: { organizationName: dto.organizationName },
      });
      if (exists)
        throw new ConflictException('Organization name is already in use');
    }

    Object.assign(org, {
      ...(dto.organizationName && { organizationName: dto.organizationName }),
      ...(dto.organizationType && { organizationType: dto.organizationType }),
      ...(dto.country && { country: dto.country }),
      ...(dto.state && { state: dto.state }),
      ...(dto.contactName && { contactName: dto.contactName }),
      ...(dto.contactEmail && { contactEmail: dto.contactEmail }),
      ...(dto.platformConfiguration && {
        platformConfiguration: {
          ...org.platformConfiguration,
          ...dto.platformConfiguration,
        },
      }),
    });

    await this.organizationRepo.save(org);
    return org;
  }
}
