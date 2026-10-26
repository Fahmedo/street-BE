// src/school-calendar/school-calendar.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolCalendar } from '../school-calendar/entities/school-calendar.entity';
import { School } from '../school/entities/school.entity';
import { CreateSchoolCalendarDto } from '../school-calendar/dto/create-school-calendar.dto';
import { UpdateSchoolCalendarDto } from '../school-calendar/dto/update-school-calendar.dto';
import { QuerySchoolCalendarDto } from '../school-calendar/dto/query-school-calendar.dto';
import { CalendarMessages } from './helper/calendar-messages';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Injectable()
export class SchoolCalendarService {
  constructor(
    @InjectRepository(SchoolCalendar)
    private readonly calendarRepo: Repository<SchoolCalendar>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    @InjectRepository(OrganizationSchool)
private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  // Create calendar term
  async createCalendar(
    organizationId: string,
    schoolId: string,
    dto: CreateSchoolCalendarDto,
  ) {
    // Verify school exists and belongs to org
    const hasAccess = await this.orgSchoolRepo.findOne({
  where: { schoolId, organizationId, isActive: true },
});
if (!hasAccess) throw new NotFoundException('School not found');

const school = await this.schoolRepo.findOne({ where: { schoolId } });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate date range
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException(CalendarMessages.INVALID_DATE_RANGE);
    }

    // Check for duplicate term (same name + academic year)
    const existing = await this.calendarRepo.findOne({
      where: {
        schoolId,
        academicYear: dto.academicYear,
        termName: dto.termName,
      },
    });

    if (existing) {
      throw new ConflictException(CalendarMessages.CALENDAR_ALREADY_EXISTS);
    }

    // Check if a current term already exists for this school
    let replacedCurrentTerm: string | null = null;

    if (dto.isCurrent) {
      const existingCurrentTerm = await this.calendarRepo.findOne({
        where: { schoolId, isCurrent: true },
      });

      if (existingCurrentTerm) {
        // Capture the name before unsetting, so we can include it in the response
        replacedCurrentTerm = `${existingCurrentTerm.termName} (${existingCurrentTerm.academicYear})`;

        await this.calendarRepo.update(
          { schoolId, isCurrent: true },
          { isCurrent: false },
        );
      }
    }

    const calendar = this.calendarRepo.create({
      ...dto,
      orgId: organizationId,
      schoolId,
      status: dto.status || 'active',
    });

    await this.calendarRepo.save(calendar);

    return {
      message: CalendarMessages.CALENDAR_CREATED,
      data: calendar,
      ...(replacedCurrentTerm && {
        warning: `"${replacedCurrentTerm}" was unset as the current term and replaced by this one.`,
      }),
    };
  }

  // Get all calendars for a school
  async getCalendars(
    organizationId: string,
    schoolId: string,
    query?: QuerySchoolCalendarDto,
  ) {
    const qb = this.calendarRepo
      .createQueryBuilder('calendar')
      .where('calendar.org_id = :organizationId', { organizationId })
      .andWhere('calendar.school_id = :schoolId', { schoolId });

    // Apply filters
    if (query?.academicYear) {
      qb.andWhere('calendar.academic_year = :academicYear', {
        academicYear: query.academicYear,
      });
    }

    if (query?.status) {
      qb.andWhere('calendar.status = :status', { status: query.status });
    }

    if (query?.isCurrent !== undefined) {
      qb.andWhere('calendar.is_current = :isCurrent', {
        isCurrent: query.isCurrent,
      });
    }

    const calendars = await qb
      .orderBy('calendar.academic_year', 'DESC')
      .addOrderBy('calendar.term_order', 'ASC')
      .getMany();

    return {
      message: CalendarMessages.CALENDARS_RETRIEVED,
      data: calendars,
    };
  }

  // Get single calendar
  async getCalendarById(
    organizationId: string,
    schoolId: string,
    calendarId: string,
  ) {
    const calendar = await this.calendarRepo.findOne({
      where: {
        calendarId,
        schoolId,
        orgId: organizationId,
      },
    });

    if (!calendar) {
      throw new NotFoundException(CalendarMessages.CALENDAR_NOT_FOUND);
    }

    return {
      message: CalendarMessages.CALENDARS_RETRIEVED,
      data: calendar,
    };
  }

  // Update calendar
  async updateCalendar(
    organizationId: string,
    schoolId: string,
    calendarId: string,
    dto: UpdateSchoolCalendarDto,
  ) {
    const calendar = await this.calendarRepo.findOne({
      where: {
        calendarId,
        schoolId,
        orgId: organizationId,
      },
    });

    if (!calendar) {
      throw new NotFoundException(CalendarMessages.CALENDAR_NOT_FOUND);
    }

    // Validate date range if being updated
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate
        ? new Date(dto.startDate)
        : new Date(calendar.startDate);
      const endDate = dto.endDate
        ? new Date(dto.endDate)
        : new Date(calendar.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException(CalendarMessages.INVALID_DATE_RANGE);
      }
    }

    // If setting as current, unset other current terms
    if (dto.isCurrent && !calendar.isCurrent) {
      await this.calendarRepo.update(
        { schoolId, isCurrent: true },
        { isCurrent: false },
      );
    }

    const updatedCalendar = this.calendarRepo.merge(calendar, dto);
    await this.calendarRepo.save(updatedCalendar);

    return {
      message: CalendarMessages.CALENDAR_UPDATED,
      data: updatedCalendar,
    };
  }

  // Set calendar as current
  async setAsCurrent(
    organizationId: string,
    schoolId: string,
    calendarId: string,
  ) {
    const calendar = await this.calendarRepo.findOne({
      where: {
        calendarId,
        schoolId,
        orgId: organizationId,
      },
    });

    if (!calendar) {
      throw new NotFoundException(CalendarMessages.CALENDAR_NOT_FOUND);
    }

    // Unset all other current terms for this school
    await this.calendarRepo.update(
      { schoolId, isCurrent: true },
      { isCurrent: false },
    );

    // Set this term as current
    calendar.isCurrent = true;
    await this.calendarRepo.save(calendar);

    return {
      message: CalendarMessages.CALENDAR_SET_CURRENT,
      data: calendar,
    };
  }

  // Delete calendar
  async deleteCalendar(
    organizationId: string,
    schoolId: string,
    calendarId: string,
  ) {
    const calendar = await this.calendarRepo.findOne({
      where: {
        calendarId,
        schoolId,
        orgId: organizationId,
      },
    });

    if (!calendar) {
      throw new NotFoundException(CalendarMessages.CALENDAR_NOT_FOUND);
    }

    // Prevent deleting current term
    if (calendar.isCurrent) {
      throw new BadRequestException(CalendarMessages.CANNOT_DELETE_CURRENT);
    }

    await this.calendarRepo.remove(calendar);

    return {
      message: CalendarMessages.CALENDAR_DELETED,
    };
  }

  // Bulk import calendars (e.g., from CSV/Excel)
  async bulkImportCalendars(
    organizationId: string,
    schoolId: string,
    calendars: CreateSchoolCalendarDto[],
  ) {
    const hasAccess = await this.orgSchoolRepo.findOne({
      where: { schoolId, organizationId, isActive: true },
    });
    if (!hasAccess) throw new NotFoundException('School not found');

    const school = await this.schoolRepo.findOne({ where: { schoolId } });


    if (!school) {
      throw new NotFoundException('School not found');
    }

    // ✅ FIX: Add proper typing
    const created: SchoolCalendar[] = []; // ✅ ADD TYPE
    const errors: Array<{ term: string; error: string }> = []; // ✅ ADD TYPE

    for (const dto of calendars) {
      try {
        const calendar = this.calendarRepo.create({
          ...dto,
          orgId: organizationId,
          schoolId,
        });
        await this.calendarRepo.save(calendar);
        created.push(calendar);
      } catch (error) {
        errors.push({
          term: dto.termName,
          error: error.message,
        });
      }
    }

    return {
      message: `Imported ${created.length} calendars, ${errors.length} failed`,
      data: { created, errors },
    };
  }
}
