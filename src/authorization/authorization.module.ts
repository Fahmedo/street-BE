// src/authorization/authorization.module.ts

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationService } from './authorization.service';
import { RolesGuard } from './guards/roles.guard';
import { School } from '../school/entities/school.entity';
import { Organization } from '../organization/entities/organization.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

/**
 * AuthorizationModule - Global module for authorization logic
 *
 * This module provides:
 * - AuthorizationService: Business logic for permission checks
 * - RolesGuard: Guard for role-based access control
 * - Public decorator: Mark routes as publicly accessible
 * - Roles decorator: Specify required roles for endpoints
 *
 * @Global decorator makes this module available everywhere in the app
 * without needing to import it in other modules
 *
 * @example
 * // No need to import AuthorizationModule in other modules
 * // Just use the decorators and services directly
 *
 * @Controller('schools')
 * export class SchoolsController {
 *   constructor(
 *     private readonly authorizationService: AuthorizationService
 *   ) {}
 *
 *   @Roles(Role.ORGANIZATION_ADMIN)
 *   @Get()
 *   async getSchools() { ... }
 * }
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([School, Organization,OrganizationSchool])],
  providers: [AuthorizationService, RolesGuard],
  exports: [AuthorizationService, RolesGuard],
})
export class AuthorizationModule {}