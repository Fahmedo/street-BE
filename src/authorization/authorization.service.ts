// src/authorization/authorization.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../school/entities/school.entity';
import { Organization } from '../organization/entities/organization.entity';
import { OrganizationStatus } from '../common/enum/organization-status';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

/**
 * AuthorizationService - Centralized authorization logic
 * 
 * Handles:
 * - Resource status validation (schools, organizations)
 * - Access control checks
 * - Permission validation
 */
@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationSchool)
private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  /**
   * Check if a school is active
   * Used by RolesGuard to validate school-level access
   * 
   * @param schoolId - UUID of the school
   * @returns true if school exists and is active, false otherwise
   */
  async isSchoolActive(schoolId: string): Promise<boolean> {
    if (!schoolId) {
      return false;
    }

    const school = await this.schoolRepo.findOne({
      where: { schoolId },
      select: ['isActive'],
    });

    return school?.isActive ?? false;
  }

  /**
   * Check if an organization is active
   * Used for validating organization-level access
   * 
   * @param organizationId - UUID of the organization
   * @returns true if organization exists and status is ACTIVE
   */
  async isOrganizationActive(organizationId: string): Promise<boolean> {
    if (!organizationId) {
      return false;
    }

    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      select: ['status'],
    });

    return org?.status === OrganizationStatus.ACTIVE;
  }

  /**
   * Validate that a school belongs to a specific organization
   * 
   * @param schoolId - UUID of the school
   * @param organizationId - UUID of the organization
   * @returns validation result with reason if invalid
   */
  async validateSchoolOwnership(
    schoolId: string,
    organizationId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
const school = await this.schoolRepo.findOne({
  where: { schoolId },
  select: ['isActive'],
});

if (!school) {
  return { valid: false, reason: 'School not found' };
}

const link = await this.orgSchoolRepo.findOne({
  where: { schoolId, organizationId },
});

if (!link) {
  return { valid: false, reason: 'School belongs to a different organization' };
}

if (!school.isActive) {
  return { valid: false, reason: 'School is inactive' };
}

return { valid: true };
  }

  /**
   * Check if user can access a specific school's resources
   * Based on user role and school assignment
   * 
   * @param userRole - User's role
   * @param userSchoolId - School ID assigned to user (null for org-level users)
   * @param targetSchoolId - School ID being accessed
   * @returns true if access is allowed
   */

   async canAccessSchool(
    userRole: string,
    userSchoolId: string | null,
    targetSchoolId: string,
  ): Promise<boolean> {
    // Organization-level roles can access all schools
    const orgLevelRoles = ['super_admin', 'organization_admin'];
    if (orgLevelRoles.includes(userRole)) {
      return true;
    }

    // School admins can only access their assigned school
    if (userRole === 'school_admin') {
      return userSchoolId === targetSchoolId;
    }

    // Mentors can access their assigned school
    if (userRole === 'mentor') {
      return userSchoolId === targetSchoolId;
    }

    return false;
  }

  /**
   * Get school details with ownership validation
   * Ensures school exists and belongs to the organization
   * 
   * @param schoolId - UUID of the school
   * @param organizationId - UUID of the organization
   * @returns School data or null if not found/invalid
   */
  async getSchoolWithValidation(
    schoolId: string,
    organizationId: string,
  ): Promise<School | null> {
  const link = await this.orgSchoolRepo.findOne({
  where: { schoolId, organizationId },
});
if (!link) return null;

const school = await this.schoolRepo.findOne({ where: { schoolId } });
return school ?? null;
  }
}