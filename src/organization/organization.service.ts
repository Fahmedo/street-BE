import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationMessage } from './helper/organization-messages';
import { OrganizationFunction } from './helper/organization-function';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

import { OrganizationStatus } from 'src/common/enum/organization-status';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { Organization } from './entities/organization.entity';
import { OrganizationUser } from '../organization-user/entities/organization-user.entity';
import { Role } from 'src/common/enum/roles.enum';

import { School } from '../school/entities/school.entity';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { CreateSchoolCalendarDto } from '../school-calendar/dto/create-school-calendar.dto';
import { QuerySchoolCalendarDto } from '../school-calendar/dto/query-school-calendar.dto';
import { EmailService } from 'src/config/email/email.service';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly organizationFunction: OrganizationFunction,

    @InjectRepository(OrganizationUser) // 👈 add this
    private readonly organizationUserRepository: Repository<OrganizationUser>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,

    @InjectRepository(SchoolCalendar)
    private readonly schoolCalendarRepository: Repository<SchoolCalendar>,
    private readonly emailService: EmailService,
@InjectRepository(OrganizationSchool)
private readonly orgSchoolRepo: Repository<OrganizationSchool>,

  ) {}

  /**
   * ✅ PUBLIC SELF-SERVICE REGISTRATION
   * Organizations can register themselves - always creates with PENDING status
   */
  async registerOrganization(dto: CreateOrganizationDto) {
    // Check duplicates
    
    const existingOrg = await this.organizationRepository.findOne({
      where: { shortCode: dto.shortCode },
    });
    if (existingOrg) {
      throw new BadRequestException(OrganizationMessage.SHORT_CODE_EXISTS);
    }

    const existingEmail = await this.organizationRepository.findOne({
      where: { adminEmail: dto.adminEmail },
    });
    if (existingEmail) {
      throw new BadRequestException(OrganizationMessage.EMAIL_ALREADY_IN_USE);
    }

    const platformConfiguration = {
      nfcAttendance: dto.nfcAttendance,
      photoAttendance: dto.photoAttendance,
      manualEntry: dto.manualEntry,
      academicPerformanceTracking: dto.academicPerformanceTracking,
      weatherInsights: dto.weatherInsights,
      rewardsAndIncentives: dto.rewardsAndIncentives,
    };

    const organization = this.organizationRepository.create({
      organizationName: dto.organizationName,
      organizationType: dto.organizationType,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      address: dto.address,
      status: OrganizationStatus.PENDING,
      shortCode: dto.shortCode.toUpperCase(),
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      contactRole: dto.contactRole,
      intendedUse: dto.intendedUse,
      expectedSchools: dto.expectedSchools,
      expectedStudents: dto.expectedStudents,
      additionalNotes: dto.additionalNotes,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      platformConfiguration,
      documents:
        dto.documents?.map((doc) => ({
          ...doc,
          uploadedAt: new Date(),
        })) || [],
    });

    await this.organizationRepository.save(organization);

    await this.emailService.sendOrganizationCreatedEmail({
      to: organization.contactEmail,
      contactName: organization.contactName,
      organizationName: organization.organizationName,
    });

    return {
      message:
        'Registration submitted successfully. You will receive an email once your application is reviewed.',
      id: organization.id,
    };
  }

  /**
   * ✅ SUPER ADMIN ORGANIZATION CREATION
   * Super Admin manually creates organization - always PENDING status
   */
  async createOrganizationAccount(dto: CreateOrganizationDto) {
    // Check duplicates
    const existingOrg = await this.organizationRepository.findOne({
      where: { shortCode: dto.shortCode },
    });
    if (existingOrg) {
      throw new BadRequestException(OrganizationMessage.SHORT_CODE_EXISTS);
    }

    const existingEmail = await this.organizationRepository.findOne({
      where: { adminEmail: dto.adminEmail },
    });
    if (existingEmail) {
      throw new BadRequestException(OrganizationMessage.EMAIL_ALREADY_IN_USE);
    }

    const platformConfiguration = {
      nfcAttendance: dto.nfcAttendance,
      photoAttendance: dto.photoAttendance,
      manualEntry: dto.manualEntry,
      academicPerformanceTracking: dto.academicPerformanceTracking,
      weatherInsights: dto.weatherInsights,
      rewardsAndIncentives: dto.rewardsAndIncentives,
    };

    const organization = this.organizationRepository.create({
      organizationName: dto.organizationName,
      organizationType: dto.organizationType,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      address: dto.address,
      status: OrganizationStatus.PENDING,
      shortCode: dto.shortCode.toUpperCase(),
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      contactRole: dto.contactRole,
      intendedUse: dto.intendedUse,
      expectedSchools: dto.expectedSchools,
      expectedStudents: dto.expectedStudents,
      additionalNotes: dto.additionalNotes,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      platformConfiguration,
      documents:
        dto.documents?.map((doc) => ({
          ...doc,
          uploadedAt: new Date(),
        })) || [],
    });

    await this.organizationRepository.save(organization);

    await this.emailService.sendOrganizationCreatedEmail({
      to: organization.contactEmail,
      contactName: organization.contactName,
      organizationName: organization.organizationName,
    });

    return {
      message: OrganizationMessage.ORGANIZATION_CREATED,
      id: organization.id,
    };
  }

  async suspendOrganization(orgId: string) {
    const org = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');
    if (org.status === OrganizationStatus.SUSPENDED) {
      throw new BadRequestException('Organization is already suspended');
    }

    org.status = OrganizationStatus.SUSPENDED;
    await this.organizationRepository.save(org);

    await this.emailService.sendOrganizationSuspendedEmail({
      to: org.contactEmail,
      contactName: org.contactName,
      organizationName: org.organizationName,
      reason:
        'Your organization has been suspended. Please contact support for details.',
    });
    return { message: 'Organization suspended successfully' };
  }
  async activateOrganization(orgId: string) {
    const org = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (org.status === OrganizationStatus.ACTIVE) {
      throw new BadRequestException('Organization is already active');
    }

    // Check if org admin user already exists
    const existingUser = await this.organizationUserRepository.findOne({
      where: { email: org.adminEmail },
    });

    org.status = OrganizationStatus.ACTIVE;
    await this.organizationRepository.save(org);

    // Only create admin user if they don't exist yet
    if (!existingUser) {
      const generatePassword =
        this.organizationFunction.generateRandomPassword();
      const hashedPassword =
        await this.organizationFunction.hashPassword(generatePassword);

      const orgAdminUser = this.organizationUserRepository.create({
        firstName: org.adminName.split(' ')[0] ?? org.adminName,
        lastName: org.adminName.split(' ')[1] ?? '',
        email: org.adminEmail,
        password: hashedPassword,
        roles: [Role.ORGANIZATION_ADMIN],
        status: OrganizationStatus.ACTIVE,
        organizationId: org.id,
        schoolId: null,
      });

      await this.organizationUserRepository.save(orgAdminUser);

      await this.emailService.sendOrganizationApprovedEmail({
        to: org.contactEmail,
        contactName: org.contactName,
        organizationName: org.organizationName,
      });

      // Send welcome email to admin user
      await this.emailService.sendWelcomeEmail({
        to: org.adminEmail,
        firstName: orgAdminUser.firstName,
        tempPassword: generatePassword,
        role: 'Organization Admin',
        organizationName: org.organizationName,
      });
      return {
        message: 'Organization activated and admin user created',
        //tempPassword: generatePassword, // remove in production
      };
    }

    return { message: 'Organization activated successfully' };
  }

  async createOrgAdminFromExistingOrg(organizationId: string) {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    // Check if org admin user already exists
    const existingUser = await this.organizationUserRepository.findOne({
      where: { email: org.adminEmail },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Org admin user already exists for this organization',
      );
    }

    const generatePassword = this.organizationFunction.generateRandomPassword();
    const hashedPassword =
      await this.organizationFunction.hashPassword(generatePassword);

    const orgAdminUser = this.organizationUserRepository.create({
      firstName: org.adminName.split(' ')[0] ?? org.adminName,
      lastName: org.adminName.split(' ')[1] ?? '',
      email: org.adminEmail,
      password: hashedPassword,
      roles: [Role.ORGANIZATION_ADMIN],
      status: OrganizationStatus.ACTIVE,
      organizationId: org.id,
      schoolId: null,
    });

    await this.organizationUserRepository.save(orgAdminUser);

    await this.emailService.sendWelcomeEmail({
      to: org.adminEmail,
      firstName: orgAdminUser.firstName,
      tempPassword: generatePassword,
      role: 'Organization Admin',
      organizationName: org.organizationName,
    });
    return {
      message: 'Org admin user created successfully',
      email: org.adminEmail,
      tempPassword: generatePassword, // remove in production, send via email
    };
  }

  async retrieveOrganizationAccountById(organizationId: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new UnauthorizedException(
        OrganizationMessage.ORGANIZATION_NOT_FOUND,
      );
    }
    const result =
      this.organizationFunction.formatOrganizationResponse(organization);
    return result;
  }

  async retrieveAllOrganizations(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    const qb = this.organizationRepository
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.schoolCount', 'org.schools');

    if (query.category) {
      qb.andWhere('org.status = :status', { status: query.category });
    }

    if (query.searchTerm) {
      const search = `%${query.searchTerm.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(org.organizationName) LIKE :search', { search })
            .orWhere('LOWER(org.organizationType) LIKE :search', { search })
            .orWhere('LOWER(org.country) LIKE :search', { search })
            .orWhere('LOWER(org.state) LIKE :search', { search });
        }),
      );
    }

    const [
      totalOrganizations,
      activeOrganizations,
      pendingOrganizations,
      suspendedOrganizations,
    ] = await Promise.all([
      this.organizationRepository.count(),
      this.organizationRepository.count({
        where: { status: OrganizationStatus.ACTIVE },
      }),
      this.organizationRepository.count({
        where: { status: OrganizationStatus.PENDING },
      }),
      this.organizationRepository.count({
        where: { status: OrganizationStatus.SUSPENDED },
      }),
    ]);

    const [organizations, totalItems] = await qb
      .orderBy('org.createdAt', 'DESC')
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    const items = organizations.map((org) => ({
      id: org.id,
      organizationName: org.organizationName,
      organizationType: org.organizationType,
      shortCode: org.shortCode,
      country: org.country,
      state: org.state,
      city: org.city,
      address: org.address,
      location: `${org.country}, ${org.state}${org.city ? ', ' + org.city : ''}`,
      status: org.status,
      schools: (org as any).schoolCount ?? 0,
      contactName: org.contactName,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      contactRole: org.contactRole,
      adminName: org.adminName,
      adminEmail: org.adminEmail,
      intendedUse: org.intendedUse,
      expectedSchools: org.expectedSchools,
      expectedStudents: org.expectedStudents,
      documents: org.documents,
      createdAt: org.createdAt,
    }));

    return {
      message: 'Organizations retrieved successfully',
      stats: {
        totalOrganizations,
        activeOrganizations,
        pendingOrganizations,
        suspendedOrganizations,
      },
      items,
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

  async updateOrganization(orgId: string, dto: CreateOrganizationDto) {
    const org = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check if shortCode is being changed and if it's already taken by another org
    if (dto.shortCode && dto.shortCode !== org.shortCode) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { shortCode: dto.shortCode },
      });
      if (existingOrg) {
        throw new BadRequestException(OrganizationMessage.SHORT_CODE_EXISTS);
      }
    }

    // Check if adminEmail is being changed and if it's already in use by another org
    if (dto.adminEmail && dto.adminEmail !== org.adminEmail) {
      const existingEmail = await this.organizationRepository.findOne({
        where: { adminEmail: dto.adminEmail },
      });
      if (existingEmail) {
        throw new BadRequestException(OrganizationMessage.EMAIL_ALREADY_IN_USE);
      }
    }

    const platformConfiguration = {
      nfcAttendance: dto.nfcAttendance,
      photoAttendance: dto.photoAttendance,
      manualEntry: dto.manualEntry,
      academicPerformanceTracking: dto.academicPerformanceTracking,
      weatherInsights: dto.weatherInsights,
      rewardsAndIncentives: dto.rewardsAndIncentives,
    };

    org.organizationName = dto.organizationName;
    org.organizationType = dto.organizationType;
    org.country = dto.country;
    org.state = dto.state;
    org.city = dto.city;
    org.address = dto.address;
    org.shortCode = dto.shortCode.toUpperCase();
    org.contactName = dto.contactName;
    org.contactEmail = dto.contactEmail;
    org.contactPhone = dto.contactPhone;
    org.contactRole = dto.contactRole;
    org.intendedUse = dto.intendedUse;
    org.expectedSchools = dto.expectedSchools;
    org.expectedStudents = dto.expectedStudents;
    org.additionalNotes = dto.additionalNotes;
    org.adminName = dto.adminName;
    org.adminEmail = dto.adminEmail;
    org.platformConfiguration = platformConfiguration;
    org.documents =
      dto.documents?.map((doc) => ({
        ...doc,
        uploadedAt: new Date(),
      })) || org.documents;

    await this.organizationRepository.save(org);

    return {
      message: 'Organization updated successfully',
      organization: this.organizationFunction.formatOrganizationResponse(org),
    };
  }
  async retrieveUserById(userId: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: userId },
    });
    if (!organization) {
      throw new UnauthorizedException('User not found.');
    }
    const result =
      this.organizationFunction.formatOrganizationResponse(organization);
    return result;
  }

  async deleteOrganization(orgId: string) {
    const org = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (org.status === OrganizationStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active organization. Suspend it first.',
      );
    }

    await this.organizationRepository.remove(org);

    return { message: 'Organization deleted successfully' };
  }

  ////neweeeeeeeeeeeeee

  /**
   * Get all calendars for all schools under an organization
   */
  async getOrganizationCalendars(orgId: string, query: QuerySchoolCalendarDto) {
    const {
      page = 1,
      limit = 10,
      academicYear,
      schoolId,
      termName,
      isCurrent,
      status,
    } = query;
    const skip = (page - 1) * limit;

    // First verify the organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all school IDs for this organization
 const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId: orgId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);

    if (schoolIds.length === 0) {
      // No schools found, return empty result
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    }

    // Build query for calendars
    const qb = this.schoolCalendarRepository
      .createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.school', 'school')
      .where('calendar.orgId = :orgId', { orgId })
      .andWhere('calendar.schoolId IN (:...schoolIds)', { schoolIds });

    // Apply filters
    if (academicYear) {
      qb.andWhere('calendar.academicYear = :academicYear', { academicYear });
    }

    if (schoolId) {
      qb.andWhere('calendar.schoolId = :schoolId', { schoolId });
    }

    if (termName) {
      qb.andWhere('calendar.termName ILIKE :termName', {
        termName: `%${termName}%`,
      });
    }

    if (isCurrent !== undefined) {
      qb.andWhere('calendar.isCurrent = :isCurrent', { isCurrent });
    }

    if (status) {
      qb.andWhere('calendar.status = :status', { status });
    }

    // Get total count for pagination
    const total = await qb.getCount();

    // Get paginated results
    const calendars = await qb
      .orderBy('calendar.academicYear', 'DESC')
      .addOrderBy('calendar.termOrder', 'ASC')
      .addOrderBy('school.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: calendars,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Create a new calendar record for a school under an organization
   */
  async createSchoolCalendar(
    orgId: string,
    schoolId: string | null, // null = apply to all schools
    createDto: CreateSchoolCalendarDto,
  ) {
    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });
    if (!organization) throw new NotFoundException('Organization not found');

    // ── "Apply to all schools" path ──────────────────────────────

    
    if (!schoolId) {
      const orgSchoolLinks = await this.orgSchoolRepo.find({
  where: { organizationId: orgId, isActive: true },
  select: ['schoolId'],
});
const allSchools = orgSchoolLinks;

      if (allSchools.length === 0) {
        throw new NotFoundException('No schools found for this organization');
      }

      const results: SchoolCalendar[] = [];
      const errors: { schoolId: string; error: string }[] = [];

      for (const school of allSchools) {
        try {
          // Skip if term already exists for this school
          const existing = await this.schoolCalendarRepository.findOne({
            where: {
              schoolId: school.schoolId,
              academicYear: createDto.academicYear,
              termName: createDto.termName,
            },
          });

          if (existing) {
            errors.push({
              schoolId: school.schoolId,
              error: `Term already exists`,
            });
            continue;
          }

          // Unset current term for this school if needed
          if (createDto.isCurrent) {
            await this.schoolCalendarRepository.update(
              { schoolId: school.schoolId, isCurrent: true },
              { isCurrent: false },
            );
          }

          const calendar = this.schoolCalendarRepository.create({
            ...createDto,
            orgId,
            schoolId: school.schoolId,
          });

          const saved = await this.schoolCalendarRepository.save(calendar);
          results.push(saved);
        } catch (err) {
          errors.push({ schoolId: school.schoolId, error: err.message });
        }
      }

      return {
        message: `Calendar created for ${results.length} school(s)${errors.length > 0 ? `, skipped ${errors.length}` : ''}`,
        data: results,
        ...(errors.length > 0 && { skipped: errors }),
      };
    }

    // ── Single school path ───────────────────────────────────────
    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId:orgId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const school = await this.schoolRepository.findOne({
     where: { schoolId: In(schoolIds), isActive: true },
    });
    if (!school) {
      throw new NotFoundException(
        'School not found or does not belong to this organization',
      );
    }

    const existingCalendar = await this.schoolCalendarRepository.findOne({
      where: {
        schoolId,
        academicYear: createDto.academicYear,
        termName: createDto.termName,
      },
    });
    if (existingCalendar) {
      throw new BadRequestException(
        `Term "${createDto.termName}" for academic year ${createDto.academicYear} already exists for this school`,
      );
    }

    let replacedCurrentTerm: string | null = null;
    if (createDto.isCurrent) {
      const existingCurrentTerm = await this.schoolCalendarRepository.findOne({
        where: { schoolId, isCurrent: true },
      });
      if (existingCurrentTerm) {
        replacedCurrentTerm = `${existingCurrentTerm.termName} (${existingCurrentTerm.academicYear})`;
        await this.schoolCalendarRepository.update(
          { schoolId, isCurrent: true },
          { isCurrent: false },
        );
      }
    }

    const calendar = this.schoolCalendarRepository.create({
      ...createDto,
      orgId,
      schoolId,
    });
    const savedCalendar = await this.schoolCalendarRepository.save(calendar);

    return {
      message: 'School calendar created successfully',
      data: savedCalendar,
      ...(replacedCurrentTerm && {
        warning: `"${replacedCurrentTerm}" was unset as the current term and replaced by this one.`,
      }),
    };
  }

  /**
   * Get calendar statistics for an organization
   */
  async getOrganizationCalendarStats(orgId: string) {
    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId:orgId, isActive: true },
  select: ['schoolId'],
});
const schoolIdss = orgSchools.map((os) => os.schoolId);
    // Get all school IDs for this organization
    const schools = await this.schoolRepository.find({
      where: { schoolId: In(schoolIdss), isActive: true },
      select: ['schoolId', 'name'],
    });

    const schoolIds = schools.map((school) => school.schoolId);

    if (schoolIds.length === 0) {
      return {
        totalCalendars: 0,
        activeCalendars: 0,
        currentTerms: 0,
        schoolsWithCalendars: 0,
        schoolsWithoutCalendars: 0,
        byAcademicYear: [],
        byStatus: [],
        schoolBreakdown: [],
      };
    }

    // Get counts
    const [totalCalendars, activeCalendars, currentTerms] = await Promise.all([
      this.schoolCalendarRepository.count({
        where: { orgId, schoolId: In(schoolIds) },
      }),
      this.schoolCalendarRepository.count({
        where: { orgId, schoolId: In(schoolIds), status: 'active' },
      }),
      this.schoolCalendarRepository.count({
        where: { orgId, schoolId: In(schoolIds), isCurrent: true },
      }),
    ]);

    // Get schools with calendars
    const schoolsWithCalendarsQuery = await this.schoolCalendarRepository
      .createQueryBuilder('calendar')
      .select('calendar.schoolId')
      .where('calendar.orgId = :orgId', { orgId })
      .andWhere('calendar.schoolId IN (:...schoolIds)', { schoolIds })
      .groupBy('calendar.schoolId')
      .getRawMany();

    const schoolsWithCalendars = schoolsWithCalendarsQuery.length;
    const schoolsWithoutCalendars = schools.length - schoolsWithCalendars;

    // Get breakdown by academic year
    const byAcademicYear = await this.schoolCalendarRepository
      .createQueryBuilder('calendar')
      .select('calendar.academicYear', 'academicYear')
      .addSelect('COUNT(*)', 'count')
      .where('calendar.orgId = :orgId', { orgId })
      .andWhere('calendar.schoolId IN (:...schoolIds)', { schoolIds })
      .groupBy('calendar.academicYear')
      .orderBy('calendar.academicYear', 'DESC')
      .getRawMany();

    // Get breakdown by status
    const byStatus = await this.schoolCalendarRepository
      .createQueryBuilder('calendar')
      .select('calendar.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('calendar.orgId = :orgId', { orgId })
      .andWhere('calendar.schoolId IN (:...schoolIds)', { schoolIds })
      .groupBy('calendar.status')
      .getRawMany();

    // Get breakdown by school
    const schoolBreakdown = await this.schoolCalendarRepository
      .createQueryBuilder('calendar')
      .select('calendar.schoolId', 'schoolId')
      .addSelect('school.name', 'schoolName')
      .addSelect('COUNT(*)', 'calendarCount')
      .addSelect(
        'SUM(CASE WHEN calendar.isCurrent = true THEN 1 ELSE 0 END)',
        'currentTerms',
      )
      .leftJoin('calendar.school', 'school')
      .where('calendar.orgId = :orgId', { orgId })
      .andWhere('calendar.schoolId IN (:...schoolIds)', { schoolIds })
      .groupBy('calendar.schoolId')
      .addGroupBy('school.name')
      .getRawMany();

    return {
      totalCalendars,
      activeCalendars,
      currentTerms,
      schoolsWithCalendars,
      schoolsWithoutCalendars,
      byAcademicYear,
      byStatus,
      schoolBreakdown,
    };
  }

  /**
   * Bulk create calendars for multiple schools
   */
  async bulkCreateCalendars(
    orgId: string,
    calendars: Array<CreateSchoolCalendarDto & { schoolId: string }>,
  ) {
    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all school IDs from the request
    const schoolIds = [...new Set(calendars.map((cal) => cal.schoolId))];


    // Verify all schools exist and belong to this organization
    const schools = await this.schoolRepository.find({
      where: {
        schoolId: In(schoolIds)
      },
    });

    if (schools.length !== schoolIds.length) {
      throw new BadRequestException(
        'One or more schools do not exist or do not belong to this organization',
      );
    }

    // Check for duplicate terms in the request
    const duplicates: string[] = [];
    const seen = new Set();

    for (const cal of calendars) {
      const key = `${cal.schoolId}-${cal.academicYear}-${cal.termName}`;
      if (seen.has(key)) {
        duplicates.push(
          `${cal.termName} (School: ${cal.schoolId}, Year: ${cal.academicYear})`,
        );
      }
      seen.add(key);
    }

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate terms found in request: ${duplicates.join(', ')}`,
      );
    }

    // Check for existing terms in database
    const existingTerms: string[] = [];
    for (const cal of calendars) {
      const existing = await this.schoolCalendarRepository.findOne({
        where: {
          schoolId: cal.schoolId,
          academicYear: cal.academicYear,
          termName: cal.termName,
        },
      });

      if (existing) {
        existingTerms.push(
          `${cal.termName} (School: ${cal.schoolId}, Year: ${cal.academicYear})`,
        );
      }
    }

    if (existingTerms.length > 0) {
      throw new BadRequestException(
        `Terms already exist: ${existingTerms.join(', ')}`,
      );
    }

    // Handle current term flags
    const currentTermSchools = calendars
      .filter((cal) => cal.isCurrent)
      .map((cal) => cal.schoolId);

    if (currentTermSchools.length > 0) {
      // Reset current flags for these schools
      await this.schoolCalendarRepository.update(
        { schoolId: In(currentTermSchools), isCurrent: true },
        { isCurrent: false },
      );
    }

    // Create all calendars
    const calendarEntities = calendars.map((cal) =>
      this.schoolCalendarRepository.create({
        ...cal,
        orgId: orgId,
      }),
    );

    const savedCalendars =
      await this.schoolCalendarRepository.save(calendarEntities);

    return {
      message: `${savedCalendars.length} calendars created successfully`,
      data: savedCalendars,
    };
  }

  /**
   * Update a calendar record
   */
  async updateCalendar(
    orgId: string,
    calendarId: string,
    updateDto: Partial<CreateSchoolCalendarDto> & {
      propagateToAllSchools?: boolean;
    },
  ) {
    // Find the calendar and ensure it belongs to this organization
    const calendar = await this.schoolCalendarRepository.findOne({
      where: { calendarId, orgId },
    });

    if (!calendar) {
      throw new NotFoundException(
        'Calendar not found or does not belong to this organization',
      );
    }

    // ── Propagate to all schools with same term ──────────────────
    if (updateDto.propagateToAllSchools) {
      const { propagateToAllSchools, ...updateFields } = updateDto;

      // Find all calendars in this org with same termName + academicYear
      const relatedCalendars = await this.schoolCalendarRepository.find({
        where: {
          orgId,
          termName: calendar.termName,
          academicYear: calendar.academicYear,
        },
      });

      const updated: SchoolCalendar[] = [];

      for (const related of relatedCalendars) {
        // Handle isCurrent per school
        if (updateFields.isCurrent && !related.isCurrent) {
          await this.schoolCalendarRepository.update(
            { schoolId: related.schoolId, isCurrent: true },
            { isCurrent: false },
          );
        }

        // Check for duplicate if term name or year is changing
        if (
          (updateFields.termName &&
            updateFields.termName !== related.termName) ||
          (updateFields.academicYear &&
            updateFields.academicYear !== related.academicYear)
        ) {
          const duplicate = await this.schoolCalendarRepository.findOne({
            where: {
              schoolId: related.schoolId,
              academicYear: updateFields.academicYear || related.academicYear,
              termName: updateFields.termName || related.termName,
            },
          });

          if (duplicate && duplicate.calendarId !== related.calendarId) {
            continue; // skip this school if it would create a duplicate
          }
        }

        Object.assign(related, updateFields);
        const saved = await this.schoolCalendarRepository.save(related);
        updated.push(saved);
      }

      return {
        message: `Updated ${updated.length} calendar(s) across schools`,
        data: updated,
      };
    }

    // ── Single calendar update (default) ─────────────────────────
    if (updateDto.isCurrent && !calendar.isCurrent) {
      await this.schoolCalendarRepository.update(
        { schoolId: calendar.schoolId, isCurrent: true },
        { isCurrent: false },
      );
    }

    if (
      (updateDto.academicYear &&
        updateDto.academicYear !== calendar.academicYear) ||
      (updateDto.termName && updateDto.termName !== calendar.termName)
    ) {
      const existingCalendar = await this.schoolCalendarRepository.findOne({
        where: {
          schoolId: calendar.schoolId,
          academicYear: updateDto.academicYear || calendar.academicYear,
          termName: updateDto.termName || calendar.termName,
        },
      });

      if (existingCalendar && existingCalendar.calendarId !== calendarId) {
        throw new BadRequestException(
          `Term "${updateDto.termName || calendar.termName}" for academic year ${updateDto.academicYear || calendar.academicYear} already exists for this school`,
        );
      }
    }

    Object.assign(calendar, updateDto);
    const updatedCalendar = await this.schoolCalendarRepository.save(calendar);

    return {
      message: 'Calendar updated successfully',
      data: updatedCalendar,
    };
  }

  /**
   * Delete a calendar record
   */
  async deleteCalendar(orgId: string, calendarId: string) {
    // Find the calendar and ensure it belongs to this organization
    const calendar = await this.schoolCalendarRepository.findOne({
      where: {
        calendarId: calendarId,
        orgId: orgId,
      },
    });

    if (!calendar) {
      throw new NotFoundException(
        'Calendar not found or does not belong to this organization',
      );
    }

    await this.schoolCalendarRepository.remove(calendar);

    return {
      message: 'Calendar deleted successfully',
    };
  }

  /**
   * Get current term for a specific school
   */
  async getSchoolCurrentTerm(orgId: string, schoolId: string) {
    // Verify school belongs to organization
    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId:orgId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const school = await this.schoolRepository.findOne({
      where: { schoolId: In(schoolIds), isActive: true },
    });

    if (!school) {
      throw new NotFoundException(
        'School not found or does not belong to this organization',
      );
    }

    const currentTerm = await this.schoolCalendarRepository.findOne({
      where: {
        schoolId: schoolId,
        isCurrent: true,
        status: 'active',
      },
    });

    if (!currentTerm) {
      return {
        message: 'No current term found for this school',
        data: null,
      };
    }

    return {
      data: currentTerm,
    };
  }

  /**
   * Set a term as current for a school (automatically unsets others)
   */
  async setCurrentTerm(orgId: string, schoolId: string, calendarId: string) {
    // Verify school belongs to organization
    const orgSchools = await this.orgSchoolRepo.find({
  where: { organizationId:orgId, isActive: true },
  select: ['schoolId'],
});
const schoolIds = orgSchools.map((os) => os.schoolId);
    const school = await this.schoolRepository.findOne({
     where: { schoolId: In(schoolIds), isActive: true },
    });

    if (!school) {
      throw new NotFoundException(
        'School not found or does not belong to this organization',
      );
    }

    // Verify calendar exists and belongs to this school
    const calendar = await this.schoolCalendarRepository.findOne({
      where: {
        calendarId: calendarId,
        schoolId: schoolId,
        orgId: orgId,
      },
    });

    if (!calendar) {
      throw new NotFoundException(
        'Calendar not found or does not belong to this school',
      );
    }

    // Unset any current term for this school
    await this.schoolCalendarRepository.update(
      { schoolId: schoolId, isCurrent: true },
      { isCurrent: false },
    );

    // Set this term as current
    calendar.isCurrent = true;
    const updatedCalendar = await this.schoolCalendarRepository.save(calendar);

    return {
      message: 'Current term updated successfully',
      data: updatedCalendar,
    };
  }
}
