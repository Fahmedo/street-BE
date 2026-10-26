// organization-user.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import moment from 'moment';
import { OrganizationUser } from './entities/organization-user.entity';

import { OrganizationUserSchool } from './entities/organization-user-school.entity';
import { OrganizationUserFunction } from './helper/organization-user-function';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';
import { OrganizationUserMessage } from './helper/organization-user-messages';

import { OrganizationStatus } from 'src/common/enum/organization-status';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { AdminUserFunction } from 'src/admin-user/helper/admin-user-function';
import { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Role } from 'src/common/enum/roles.enum';
import { School } from 'src/school/entities/school.entity';
import { EmailService } from '../config/email/email.service';
import { Organization } from '../organization/entities/organization.entity';

const SCHOOL_SCOPED_ROLES = [Role.SCHOOL_ADMIN];
@Injectable()
export class OrganizationUserService {
  constructor(
    @InjectRepository(OrganizationUser)
    private readonly organizationUserRepository: Repository<OrganizationUser>,
    private readonly organizationUserFunction: OrganizationUserFunction,

    @InjectRepository(OrganizationUserSchool)
    private readonly orgUserSchoolRepository: Repository<OrganizationUserSchool>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    private readonly adminUserFunction: AdminUserFunction,
    private readonly emailService: EmailService,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  private requiresSchoolAssignment(roles: Role[]): boolean {
    return roles.some((role) => SCHOOL_SCOPED_ROLES.includes(role));
  }

  // Validate that all provided schoolIds exist and belong to the org
  private async validateSchools(
    schoolIds: string[],
    organizationId: string,
  ): Promise<School[]> {
    const schools = await this.schoolRepository.findByIds(schoolIds);

    if (schools.length !== schoolIds.length) {
      throw new NotFoundException('One or more schools not found');
    }

    // Verify all schools belong to org via junction table
    const orgLinks = await this.orgUserSchoolRepository.manager
      .getRepository('OrganizationSchool' /* use your actual entity */)
      .find({ where: { organizationId, schoolId: In(schoolIds) } });

    if (orgLinks.length !== schoolIds.length) {
      const linkedIds = new Set(orgLinks.map((l: any) => l.schoolId));
      const wrongSchool = schools.find((s) => !linkedIds.has(s.schoolId));
      throw new BadRequestException(
        `School ${wrongSchool?.name ?? 'unknown'} does not belong to your organization`,
      );
    }

    return schools;
  }

  // Sync school assignments for a user
  private async syncSchoolAssignments(
    userId: string,
    schoolIds: string[],
    primarySchoolId: string,
  ): Promise<void> {
    // Remove existing assignments
    await this.orgUserSchoolRepository.delete({ userId });

    if (!schoolIds.length) return;

    // Create new assignments
    const assignments = schoolIds.map((schoolId) =>
      this.orgUserSchoolRepository.create({
        userId,
        schoolId,
        isPrimary: schoolId === primarySchoolId,
      }),
    );

    await this.orgUserSchoolRepository.save(assignments);
  }
  // ─── CREATE ───────────────────────────────────────────────────────────────
  async createOrganizationUserAccount(
    dto: CreateOrganizationUserDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.organizationUserRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        OrganizationUserMessage.EMAIL_ALREADY_IN_USE,
      );
    }

    const needsSchool = this.requiresSchoolAssignment(dto.roles);

    // ✅ If role requires school, schoolIds must be provided
    if (needsSchool && (!dto.schoolIds || dto.schoolIds.length === 0)) {
      throw new BadRequestException(
        `Users with roles [${dto.roles.filter((r) => SCHOOL_SCOPED_ROLES.includes(r)).join(', ')}] must be assigned to at least one school`,
      );
    }

    // ✅ org_admin does not need a school — ignore schoolIds if provided
    const schoolIds = needsSchool ? (dto.schoolIds ?? []) : [];
    const primarySchoolId = schoolIds[0] ?? null;

    // Validate schools belong to org
    if (schoolIds.length > 0) {
      await this.validateSchools(schoolIds, currentUser.organizationId!);
    }

    const generatePassword =
      this.organizationUserFunction.generateRandomPassword();
    const hashedPassword =
      await this.organizationUserFunction.hashPassword(generatePassword);

    const user = this.organizationUserRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber ?? null,
      address: dto.address ?? null,
      password: hashedPassword,
      roles: dto.roles,
      status: dto.status,
      organizationId: currentUser.organizationId!,
      schoolId: primarySchoolId, // denormalized primary school
    });

    await this.organizationUserRepository.save(user);

    // ✅ Create school assignments in junction table
    if (schoolIds.length > 0) {
      await this.syncSchoolAssignments(user.id, schoolIds, primarySchoolId);
    }
    const organization = await this.organizationRepo.findOne({
      where: { id: currentUser.organizationId! },
      select: ['organizationName'],
    });

    await this.emailService.sendWelcomeEmail({
      to: dto.email,
      firstName: dto.firstName,
      tempPassword: generatePassword,
      role: dto.roles[0],
      organizationName: organization?.organizationName ?? 'Your Organization',
    });

    return {
      message: OrganizationUserMessage.USER_CREATED,
      tempPassword: generatePassword,
      id: user.id,
    };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  async updateOrganizationUser(
    userId: string,
    dto: UpdateOrganizationUserDto,
    currentUser: AuthenticatedUser,
  ) {
    const user = await this.findUserInOrg(userId, currentUser.organizationId!);

    // Check email uniqueness
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.organizationUserRepository.findOne({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new BadRequestException(
          OrganizationUserMessage.EMAIL_ALREADY_IN_USE,
        );
      }
    }

    // Determine effective roles after update
    const effectiveRoles = dto.roles ?? user.roles;
    const needsSchool = this.requiresSchoolAssignment(effectiveRoles);

    // ✅ If roles changed to school-scoped and no schools provided or currently assigned
    if (needsSchool && dto.schoolIds !== undefined) {
      if (dto.schoolIds.length === 0) {
        throw new BadRequestException(
          `Users with roles [${effectiveRoles.filter((r) => SCHOOL_SCOPED_ROLES.includes(r)).join(', ')}] must be assigned to at least one school`,
        );
      }
      await this.validateSchools(dto.schoolIds, currentUser.organizationId!);
    }

    // ✅ If role changed TO org_admin only — clear school assignments
    const isNowOrgAdminOnly =
      dto.roles &&
      dto.roles.includes(Role.ORGANIZATION_ADMIN) &&
      !dto.roles.some((r) => SCHOOL_SCOPED_ROLES.includes(r));

    if (isNowOrgAdminOnly) {
      await this.orgUserSchoolRepository.delete({ userId });
      Object.assign(user, { schoolId: null });
    }

    // ✅ Update school assignments if schoolIds provided
    if (dto.schoolIds !== undefined && needsSchool) {
      const primarySchoolId = dto.schoolIds[0] ?? null;
      await this.syncSchoolAssignments(userId, dto.schoolIds, primarySchoolId);
      Object.assign(user, { schoolId: primarySchoolId }); // keep denormalized field in sync
    }

    Object.assign(user, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.email && { email: dto.email }),
      ...(dto.phoneNumber !== undefined && {
        phoneNumber: dto.phoneNumber ?? null,
      }),
      ...(dto.address !== undefined && { address: dto.address ?? null }),
      ...(dto.status && { status: dto.status }),
      ...(dto.roles && { roles: dto.roles }),
    });

    await this.organizationUserRepository.save(user);

    // Reload with school assignments for response
    const updated = await this.organizationUserRepository.findOne({
      where: { id: userId },
      relations: ['schoolAssignments', 'schoolAssignments.school'],
    });

    return {
      message: 'User updated successfully',
      user: this.formatUser(updated!),
    };
  }
  // ─── DELETE ───────────────────────────────────────────────────────────────
  async deleteOrganizationUser(userId: string, currentUser: AuthenticatedUser) {
    const user = await this.findUserInOrg(userId, currentUser.organizationId!);

    // Prevent self-deletion
    if (user.id === currentUser.userId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.organizationUserRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────
  async getOrganizationUserById(
    userId: string,
    currentUser: AuthenticatedUser,
  ) {
    const user = await this.organizationUserRepository.findOne({
      where: { id: userId, organizationId: currentUser.organizationId! },
      relations: ['schoolAssignments', 'schoolAssignments.school'],
    });
    if (!user)
      throw new NotFoundException('User not found in your organization');
    return { data: this.formatUser(user) };
  }
  // ─── GET ALL ──────────────────────────────────────────────────────────────
  async retrieveAllOrganizationUsers(
    query: PaginationQueryDto,
    currentUser: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    const qb = this.organizationUserRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.schoolAssignments', 'schoolAssignment')
      .leftJoinAndSelect('schoolAssignment.school', 'school')
      .where('user.organizationId = :organizationId', {
        organizationId: currentUser.organizationId,
      });

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.role) {
      qb.andWhere(
        `(user.roles = :exact OR user.roles LIKE :start OR user.roles LIKE :middle OR user.roles LIKE :end)`,
        {
          exact: query.role,
          start: `${query.role},%`,
          middle: `%,${query.role},%`,
          end: `%,${query.role}`,
        },
      );
    }
    if (query.searchTerm) {
      const search = `%${query.searchTerm.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(user.firstName) LIKE :search', { search })
            .orWhere('LOWER(user.lastName) LIKE :search', { search })
            .orWhere('LOWER(user.email) LIKE :search', { search });
        }),
      );
    }

    const [users, totalItems] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    const [total, active, pending, suspended] = await Promise.all([
      this.organizationUserRepository.count({
        where: { organizationId: currentUser.organizationId! },
      }),
      this.organizationUserRepository.count({
        where: {
          organizationId: currentUser.organizationId!,
          status: OrganizationStatus.ACTIVE,
        },
      }),
      this.organizationUserRepository.count({
        where: {
          organizationId: currentUser.organizationId!,
          status: OrganizationStatus.PENDING,
        },
      }),
      this.organizationUserRepository.count({
        where: {
          organizationId: currentUser.organizationId!,
          status: OrganizationStatus.SUSPENDED,
        },
      }),
    ]);

    return {
      message: 'Success',
      stats: { total, active, pending, suspended },
      items: users.map((u) => this.formatUser(u)),
      meta: {
        currentPage: page,
        itemsPerPage: perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(totalItems / perPage),
      },
    };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  private async findUserInOrg(userId: string, organizationId: string) {
    const user = await this.organizationUserRepository.findOne({
      where: { id: userId, organizationId },
    });
    if (!user)
      throw new NotFoundException('User not found in your organization');
    return user;
  }

  private formatUser = (user: OrganizationUser) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phoneNumber: user.phoneNumber,
    address: user.address,
    roles: user.roles,
    status: user.status,
    organizationId: user.organizationId,
    schoolId: user.schoolId,

    schools:
      user.schoolAssignments?.map((a) => ({
        schoolId: a.schoolId,
        name: a.school?.name,
        isPrimary: a.isPrimary,
        assignedAt: a.assignedAt,
      })) ?? [],
    createdAt: user.createdAt,
  });
}
