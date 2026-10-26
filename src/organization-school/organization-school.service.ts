import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationSchool } from './entities/organization-school.entity';
import { School } from '../school/entities/school.entity';
import { Organization } from '../organization/entities/organization.entity';
import { AddSchoolToOrganizationDto } from './dto/create-organization-school.dto';
import { SearchAvailableSchoolsDto } from './dto/search-available-schools.dto';
import { formatPaginatedResponse } from '../common/pagination/pagination.helper';

@Injectable()
export class OrganizationSchoolService {
  constructor(
    @InjectRepository(OrganizationSchool)
    private readonly orgSchoolRepo: Repository<OrganizationSchool>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Search for schools available to add (not yet added by this org)
   */
  async searchAvailableSchools(
    organizationId: string,
    query: SearchAvailableSchoolsDto,
  ) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const qb = this.schoolRepo
      .createQueryBuilder('school')
      .leftJoin(
        'school.organizationSchools',
        'orgSchool',
        'orgSchool.organizationId = :organizationId AND orgSchool.isActive = true',
        { organizationId },
      )
      .where('school.isActive = true')
      .andWhere('orgSchool.id IS NULL'); // Only schools NOT already added by this org

    if (query.searchTerm) {
      qb.andWhere(
        '(school.name ILIKE :search OR school.state ILIKE :search OR school.city ILIKE :search OR school.code ILIKE :search)',
        { search: `%${query.searchTerm}%` },
      );
    }

    if (query.state) {
      qb.andWhere('school.state = :state', { state: query.state });
    }

    if (query.city) {
      qb.andWhere('school.city = :city', { city: query.city });
    }

    const [schools, totalCount] = await qb
      .orderBy('school.name', 'ASC')
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    const schoolData = schools.map((school) => ({
      schoolId: school.schoolId,
      name: school.name,
      code: school.code,
      address: school.address,
      state: school.state,
      city: school.city,
      schoolType: school.schoolType,
      contactPerson: school.contactPerson,
      contactPhone: school.contactPhone,
      latitude: school.latitude,
      longitude: school.longitude,
    }));

    return {
      message: 'Available schools retrieved',
      data: formatPaginatedResponse(schoolData, page, perPage, totalCount),
    };
  }

  /**
   * Add a school to an organization
   */
  async addSchoolToOrganization(
    organizationId: string,
    dto: AddSchoolToOrganizationDto,
    addedByUserId: string,
  ) {
    // Check if organization exists
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check if school exists
    const school = await this.schoolRepo.findOne({
      where: { schoolId: dto.schoolId, isActive: true },
    });

    if (!school) {
      throw new NotFoundException('School not found or inactive');
    }

    // Check if already added
    const existing = await this.orgSchoolRepo.findOne({
      where: {
        organizationId,
        schoolId: dto.schoolId,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('School already added to your organization');
      } else {
        // Reactivate if previously deactivated
        existing.isActive = true;
        existing.addedByUserId = addedByUserId;
        await this.orgSchoolRepo.save(existing);

        return {
          message: 'School reactivated in your organization',
          data: {
            schoolId: school.schoolId,
            schoolName: school.name,
          },
        };
      }
    }

    // Create new organization-school relationship
    const orgSchool = this.orgSchoolRepo.create({
      organizationId,
      schoolId: dto.schoolId,
      addedByUserId,
      isActive: true,
    });

    await this.orgSchoolRepo.save(orgSchool);

    return {
      message: 'School added successfully. You can now manage classes and students.',
      data: {
        schoolId: school.schoolId,
        schoolName: school.name,
        schoolCode: school.code,
        state: school.state,
        city: school.city,
      },
    };
  }

  /**
   * Get all schools added by this organization
   */
  async getMyOrganizationSchools(
    organizationId: string,
    query: { page?: number; perPage?: number; searchTerm?: string },
  ) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const qb = this.orgSchoolRepo
      .createQueryBuilder('orgSchool')
      .leftJoinAndSelect('orgSchool.school', 'school')
      .where('orgSchool.organizationId = :organizationId', { organizationId })
      .andWhere('orgSchool.isActive = true')
      .andWhere('school.isActive = true');

    if (query.searchTerm) {
      qb.andWhere('school.name ILIKE :search', {
        search: `%${query.searchTerm}%`,
      });
    }

    const [orgSchools, totalCount] = await qb
      .orderBy('orgSchool.addedAt', 'DESC')
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    const schoolData = orgSchools.map((os) => ({
      schoolId: os.school.schoolId,
      name: os.school.name,
      code: os.school.code,
      address: os.school.address,
      state: os.school.state,
      city: os.school.city,
      schoolType: os.school.schoolType,
      contactPerson: os.school.contactPerson,
      contactPhone: os.school.contactPhone,
      addedAt: os.addedAt,
      addedByUserId: os.addedByUserId,
    }));

    return {
      message: 'Organization schools retrieved',
      data: formatPaginatedResponse(schoolData, page, perPage, totalCount),
    };
  }

  /**
   * Remove a school from organization (soft delete)
   */
  async removeSchoolFromOrganization(
    organizationId: string,
    schoolId: string,
  ) {
    const orgSchool = await this.orgSchoolRepo.findOne({
      where: {
        organizationId,
        schoolId,
        isActive: true,
      },
    });

    if (!orgSchool) {
      throw new NotFoundException(
        'School not found in your organization or already removed',
      );
    }

    // Soft delete - set isActive to false
    orgSchool.isActive = false;
    await this.orgSchoolRepo.save(orgSchool);

    return {
      message: 'School removed from your organization',
    };
  }

  /**
   * Check if an organization has access to a school
   */
  async hasAccessToSchool(
    organizationId: string,
    schoolId: string,
  ): Promise<boolean> {
    const orgSchool = await this.orgSchoolRepo.findOne({
      where: {
        organizationId,
        schoolId,
        isActive: true,
      },
    });

    return !!orgSchool;
  }

  /**
   * Get school details if org has access
   */
  async getSchoolDetails(organizationId: string, schoolId: string) {
    const hasAccess = await this.hasAccessToSchool(organizationId, schoolId);

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this school. Please add it to your organization first.',
      );
    }

    const school = await this.schoolRepo.findOne({
      where: { schoolId, isActive: true },
      relations: ['classes'],
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return {
      message: 'School details retrieved',
      data: {
        schoolId: school.schoolId,
        name: school.name,
        code: school.code,
        address: school.address,
        state: school.state,
        city: school.city,
        latitude: school.latitude,
        longitude: school.longitude,
        radiusMeters: school.radiusMeters,
        schoolType: school.schoolType,
        contactPerson: school.contactPerson,
        contactPhone: school.contactPhone,
        logoUrl: school.logoUrl,
        attendanceModes: school.attendanceModes,
        classes: school.classes.map((cls) => ({
          classId: cls.classId,
          className: cls.className,
          hierarchyLevel: cls.hierarchyLevel,
          isTerminal: cls.isTerminal,
          isActive: cls.isActive,
        })),
      },
    };
  }
}