// src/admin-user/admin-user.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AdminUser } from './entities/admin-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AdminUserFunction } from './helper/admin-user-function';
import { AdminUserMessage } from './helper/admin-user-messages';
import { AdminUserStatus } from 'src/common/enum/admin-user-status';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { AdminUserRole } from 'src/common/enum/admin-user-role';
import { EmailService } from 'src/config/email/email.service';
import { Role } from 'src/common/enum/roles.enum';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    private readonly adminUserFunction: AdminUserFunction,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new admin user account
   */
  async createAdminUserAccount(dto: CreateAdminUserDto) {
    const existingAdminEmail = await this.adminRepository.findOne({
      where: { email: dto.email },
    });

    if (existingAdminEmail) {
      throw new BadRequestException(AdminUserMessage.EMAIL_ALREADY_IN_USE);
    }
  if (!dto.roles || dto.roles.length === 0) {
    throw new BadRequestException('At least one role must be assigned');
  }

  const validAdminRoles = [Role.SUPER_ADMIN, Role.SCHOOL_MANAGER];
  const invalidRoles = dto.roles.filter(
    (role) => !validAdminRoles.includes(role as Role)
  );

  if (invalidRoles.length > 0) {
    throw new BadRequestException(
      `Invalid roles for admin user: ${invalidRoles.join(', ')}. Only ${Role.SUPER_ADMIN} and ${Role.SCHOOL_MANAGER} are allowed.`
    );
  }

    const generatePassword = this.adminUserFunction.generateRandomPassword();
    const hashedPassword =
      await this.adminUserFunction.hashPassword(generatePassword);

    const adminUser = this.adminRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: dto.roles,
      email: dto.email,
      password: hashedPassword,
      status: AdminUserStatus.PENDING,
      phoneNumber: dto.phoneNumber,
      address: dto.address,
    });

    await this.adminRepository.save(adminUser);

    await this.emailService.sendWelcomeEmail({
      to: adminUser.email,
      firstName: adminUser.firstName,
      tempPassword: generatePassword,

      role: Array.isArray(adminUser.roles)
        ? adminUser.roles.join(', ')
        : String(adminUser.roles),
      organizationName: 'Street To School Admin',
    });
    return {
      message: AdminUserMessage.USER_CREATED,
      data: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        roles: adminUser.roles, 
        temporaryPassword: generatePassword,
      },
    };
  }

  async retrieveAdminUserById(adminUserId: string) {
    const adminUser = await this.adminRepository.findOne({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
    }

    return this.adminUserFunction.formatAdminUserResponse(adminUser);
  }
  /**
   * Get all admin users with pagination and filtering
   */
  async retrieveAllAdminUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    const qb = this.adminRepository
      .createQueryBuilder('adminUser')
      .where('adminUser.roles LIKE :role', {
        role: `%${AdminUserRole.SUPER_ADMIN}%`,
      });

    if (query.searchTerm) {
      const search = `%${query.searchTerm}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('adminUser.email ILIKE :search', { search })
            .orWhere('adminUser.firstName ILIKE :search', { search })
            .orWhere('adminUser.lastName ILIKE :search', { search });
        }),
      );
    }

    if (query.status) {
      qb.andWhere('adminUser.status = :filterStatus', {
        filterStatus: query.status,
      });
    }
    const baseQueryForStats = qb.clone();

    const [totalAdmins, activeAdmins, pendingAdmins, suspendedAdmins] =
      await Promise.all([
        baseQueryForStats.getCount(),
        baseQueryForStats
          .clone()
          .andWhere('adminUser.status = :status', {
            status: AdminUserStatus.ACTIVE,
          })
          .getCount(),
        baseQueryForStats
          .clone()
          .andWhere('adminUser.status = :status', {
            status: AdminUserStatus.PENDING,
          })
          .getCount(),
        baseQueryForStats
          .clone()
          .andWhere('adminUser.status = :status', {
            status: AdminUserStatus.SUSPENDED,
          })
          .getCount(),
      ]);

    const [adminUsers, totalItems] = await qb
      .orderBy('adminUser.createdAt', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    const data = adminUsers.map((admin) => ({
      id: admin.id,
      email: admin.email,
      fullName: `${admin.firstName} ${admin.lastName}`.trim(),
      firstName: admin.firstName,
      lastName: admin.lastName,
      phoneNumber: admin.phoneNumber,
      address: admin.address,
      status: admin.status,
      roles: admin.roles, // already loaded as simple-array
      createdAt: admin.createdAt,
    }));

    return {
      message: 'Admin users retrieved successfully',
      stats: { totalAdmins, activeAdmins, pendingAdmins, suspendedAdmins },
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(totalItems / perPage),
      },
    };
  }

  async updateAdminUser(adminUserId: string, dto: Partial<CreateAdminUserDto>) {
    const adminUser = await this.adminRepository.findOne({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
    }

    if (dto.firstName) adminUser.firstName = dto.firstName;
    if (dto.lastName) adminUser.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) adminUser.phoneNumber = dto.phoneNumber;
    if (dto.address !== undefined) adminUser.address = dto.address;
    if (dto.status) adminUser.status = dto.status;

    // ✅ Update roles if provided
    if (dto.roles && Array.isArray(dto.roles)) {
      // Validate that at least one role is provided
      if (dto.roles.length === 0) {
        throw new BadRequestException('At least one role must be assigned');
      }

      // ✅ Use Role enum values
      const validAdminRoles = [Role.SUPER_ADMIN, Role.SCHOOL_MANAGER];
      const invalidRoles = dto.roles.filter(
        (role) => !validAdminRoles.includes(role),
      );

      if (invalidRoles.length > 0) {
        throw new BadRequestException(
          `Invalid roles for admin user: ${invalidRoles.join(', ')}. Only ${Role.SUPER_ADMIN} and ${Role.SCHOOL_MANAGER} are allowed.`,
        );
      }

      adminUser.roles = dto.roles;
    }

    await this.adminRepository.save(adminUser);

    return {
      message: 'Admin user updated successfully',
      data: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        phoneNumber: adminUser.phoneNumber,
        address: adminUser.address,
        status: adminUser.status,
        roles: adminUser.roles,
      },
    };
  }

  /**
   * Update admin user status
   */
  async updateAdminUserStatus(adminUserId: string, status: AdminUserStatus) {
    const adminUser = await this.adminRepository.findOne({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
    }

    adminUser.status = status;
    await this.adminRepository.save(adminUser);

    return {
      message: 'Admin user status updated successfully',
      data: this.adminUserFunction.formatAdminUserResponse(adminUser),
    };
  }

  /**
   * Update admin user roles
   */
  async updateAdminUserRoles(adminUserId: string, roleIds: string[]) {
    const adminUser = await this.adminRepository.findOne({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
    }

    // Assign new roles (you'll need to load roles from repository)
    // This is a placeholder - adjust based on your Role entity
    adminUser.roles = roleIds as any;
    await this.adminRepository.save(adminUser);

    return {
      message: 'Admin user roles updated successfully',
      data: this.adminUserFunction.formatAdminUserResponse(adminUser),
    };
  }

  /**
   * Delete admin user (soft or hard delete)
   */

  /**
   * Soft delete admin user (suspend)
   */
  async suspendAdminUser(adminUserId: string) {
    const adminUser = await this.adminRepository.findOne({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
    }

    adminUser.status = AdminUserStatus.SUSPENDED;
    await this.adminRepository.save(adminUser);

    return {
      message: 'Admin user suspended successfully',
    };
  }

  /**
   * Hard delete admin user (permanent)
   */
  async permanentlyDeleteAdminUser(adminUserId: string) {
    const adminUser = await this.adminRepository.findOne({
      where: { id: adminUserId },
    });

    if (!adminUser) {
      throw new NotFoundException(AdminUserMessage.USER_NOT_FOUND);
    }

    // Permanently remove from database
    await this.adminRepository.remove(adminUser);

    return {
      message: 'Admin user permanently deleted',
    };
  }

  // Update existing deleteAdminUser to call suspend
  async deleteAdminUser(adminUserId: string) {
    return this.suspendAdminUser(adminUserId);
  }

  /**
   * Search admin users by email or name
   */
  async searchAdminUsers(searchTerm: string) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new BadRequestException(
        'Search term must be at least 2 characters',
      );
    }

    const search = `%${searchTerm}%`;

    const adminUsers = await this.adminRepository
      .createQueryBuilder('adminUser')
      .where(
        new Brackets((qb) => {
          qb.where('adminUser.email ILIKE :search', { search })
            .orWhere('adminUser.firstName ILIKE :search', { search })
            .orWhere('adminUser.lastName ILIKE :search', { search });
        }),
      )
      .take(20)
      .getMany();

    const data = adminUsers.map((admin) => ({
      id: admin.id,
      email: admin.email,
      fullName: `${admin.firstName} ${admin.lastName}`.trim(),
      status: admin.status,
      roles: admin.roles.map((r) => String(r)),
    }));

    return {
      message: 'Search results',
      count: data.length,
      data,
    };
  }

  /**
   * Get admin user statistics
   */
  async getAdminStatistics() {
    const [totalAdmins, activeAdmins, pendingAdmins, suspendedAdmins] =
      await Promise.all([
        this.adminRepository.count(),

        this.adminRepository.count({
          where: { status: AdminUserStatus.ACTIVE },
        }),

        this.adminRepository.count({
          where: { status: AdminUserStatus.PENDING },
        }),

        this.adminRepository.count({
          where: { status: AdminUserStatus.SUSPENDED },
        }),
      ]);

    return {
      message: 'Admin statistics',
      stats: {
        totalAdmins,
        activeAdmins,
        pendingAdmins,
        suspendedAdmins,
      },
    };
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.adminRepository.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Find admin by email (internal use only)
   */
  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.adminRepository.findOne({
      where: { email },
    });
  }

  /**
   * Find admin by ID (internal use only)
   */
  async findById(userId: string): Promise<AdminUser | null> {
    return this.adminRepository.findOne({
      where: { id: userId },
    });
  }
}
