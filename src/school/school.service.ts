import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SchoolMessages } from './helper/school-message';
import { AttendanceStatus } from 'src/common/enum/attendance.enums';
import { PaginationQueryDto } from 'src/common/pagination/dto/pagination-query.dto';
import { formatPaginatedResponse } from 'src/common/pagination/pagination.helper';
import { StudentAttendanceRecord } from 'src/student-attendance/entities/student-attendance.entity';
import { StudentProfile } from 'src/student-profile/entities/student-profile.entity';
import {
  AttendanceRateRaw,
  AvgAttendanceRaw,
  ClassStudentCountRaw,
  FormatSchoolDetailsResponse,
  SchoolsDashboardResponse,
  StudentCountRaw,
} from './interface/school.interface.dto';
import { Class } from './entities/school-class.entity';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolCalendar } from 'src/school-calendar/entities/school-calendar.entity';
import { generateGlobalSchoolCode } from 'src/common/utils/generate-readable-id.util'; // ✅ CHANGED
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity'; // ✅ NEW

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    @InjectRepository(StudentAttendanceRecord)
    private readonly attendanceRepo: Repository<StudentAttendanceRecord>,

    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,

    @InjectRepository(SchoolCalendar)
    private readonly calendarRepo: Repository<SchoolCalendar>,

    // ✅ NEW: Add OrganizationSchool repository
    @InjectRepository(OrganizationSchool)
    private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  // ==================== SUPER ADMIN ONLY: Create Global School ====================
  /**
   * Super Admin creates a global school (no org association)
   */
  async createGlobalSchool(dto: CreateSchoolDto, createdByUserId: string) {
    // Check if school with same name + state + city already exists
    const existingSchool = await this.schoolRepository.findOne({
      where: {
        name: dto.name,
        state: dto.state,
        country: dto.country,
        city: dto.city,
        town: dto.town,
      },
    });

    if (existingSchool) {
      throw new ConflictException(
        'A school with this name already exists in this location',
      );
    }

    const school = this.schoolRepository.create({
      name: dto.name,
      code: generateGlobalSchoolCode(dto.name), // ✅ Global unique code (no org prefix)
      address: dto.address,
      state: dto.state,
      country: dto.country,
      city: dto.city,
      town: dto.town,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusMeters: dto.radiusMeters,
      contactPerson: dto.contactPerson,
      contactPhone: dto.contactPhone,
      logoUrl: dto.logoUrl,
      attendanceModes: dto.attendanceModes,
      schoolType: dto.schoolType,
      createdByUserId, // ✅ Track who created it
      isActive: true,
    });

    await this.schoolRepository.save(school);

    return {
      message: 'Global school created successfully',
      data: {
        schoolId: school.schoolId,
        name: school.name,
        code: school.code,
        state: school.state,
        country: school.country,
        city: school.city,
        town: school.town,
      },
    };
  }

  // ==================== SUPER ADMIN: Get All Global Schools ====================
  /**
   * Super Admin retrieves all global schools (not filtered by org)
   */
  async getAllGlobalSchools(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const qb = this.schoolRepository
      .createQueryBuilder('school')
      .where('school.is_active = true');

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

    if (query.country) {
      qb.andWhere('school.country = :country', { country: query.country });
    }

    if (query.town) {
      qb.andWhere('school.town = :town', { town: query.town });
    }
    const [schools, totalCount] = await qb
      .orderBy('school.created_at', 'DESC')
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    // Get count of orgs using each school
    const schoolIds = schools.map((s) => s.schoolId);

    const orgCounts = schoolIds.length
      ? await this.orgSchoolRepo
          .createQueryBuilder('orgSchool')
          .select('orgSchool.school_id', 'schoolId')
          .addSelect('COUNT(*)', 'count')
          .where('orgSchool.school_id IN (:...schoolIds)', { schoolIds })
          .andWhere('orgSchool.is_active = true')
          .groupBy('orgSchool.school_id')
          .getRawMany()
      : [];

    const orgCountMap = Object.fromEntries(
      orgCounts.map((r) => [r.schoolId, Number(r.count)]),
    );

    const schoolData = schools.map((school) => ({
      schoolId: school.schoolId,
      name: school.name,
      code: school.code,
      state: school.state,
      country: school.country,
      city: school.city,
      town: school.town,
      logoUrl:school.logoUrl,
      schoolType: school.schoolType,
       radiusMeters: school.radiusMeters,
         latitude: school.latitude,
        longitude: school.longitude,
      contactPerson: school.contactPerson,
      contactPhone: school.contactPhone,
      isActive: school.isActive,
      organizationsUsing: orgCountMap[school.schoolId] ?? 0, 
      createdAt: school.createdAt,
    }));

    return {
      message: 'Global schools retrieved',
      data: formatPaginatedResponse(schoolData, page, perPage, totalCount),
    };
  }

// ==================== ORG ADMIN: Get My Organization's Schools ====================
/**
 * Org Admin retrieves schools added to their organization
 * (with org-specific student counts)
 * 
 * ✅ FIXED: Changed ordering strategy to avoid TypeORM metadata issues
 */
async retrieveAllSchoolsAndDashboardStat(
  organizationId: string,
  query: PaginationQueryDto,
): Promise<SchoolsDashboardResponse> {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 10;
  const offset = (page - 1) * perPage;

  // ✅ Count only schools accessible by this org
  const totalSchools = await this.orgSchoolRepo.count({
    where: { organizationId, isActive: true },
  });

  // ✅ Count only students belonging to this org
  const totalStudents = await this.studentRepo.count({
    where: { registeredByOrgId: organizationId },
  });

  const avgAttendanceRaw = await this.attendanceRepo
    .createQueryBuilder('a')
    .select(
      `AVG(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float * 100`,
      'avg',
    )
    .where('a.organization_id = :organizationId', { organizationId })
    .setParameter('present', AttendanceStatus.PRESENT)
    .getRawOne<AvgAttendanceRaw>();

  const avgAttendanceRate = Number(avgAttendanceRaw?.avg ?? 0);

  // ✅ SOLUTION 1: Use leftJoinAndSelect instead of innerJoin
  // This loads the entire relationship and makes ordering work
  const qb = this.schoolRepository
    .createQueryBuilder('school')
    .leftJoinAndSelect('school.organizationSchools', 'orgSchool') // ✅ CHANGED: leftJoinAndSelect
    .where('orgSchool.organization_id = :organizationId', { organizationId })
    .andWhere('orgSchool.is_active = true')
    .andWhere('school.is_active = true');

  if (query.searchTerm) {
    qb.andWhere(
      '(school.name ILIKE :search OR school.state ILIKE :search OR school.city ILIKE :search)',
      { search: `%${query.searchTerm}%` },
    );
  }

  if (query.country) {
    qb.andWhere('school.country = :country', { country: query.country });
  }

  if (query.state) {
    qb.andWhere('school.state = :state', { state: query.state });
  }

  if (query.city) {
    qb.andWhere('school.city = :city', { city: query.city });
  }

  if (query.town) {
    qb.andWhere('school.town = :town', { town: query.town });
  }

  const [schools, schoolsCount] = await qb
    .orderBy('orgSchool.addedAt', 'DESC') // ✅ Now works with leftJoinAndSelect
    .skip(offset)
    .take(perPage)
    .getManyAndCount();

  if (!schools.length) {
    return {
      stats: {
        totalSchools,
        totalStudents,
        avgAttendanceRate,
        avgPerformance: avgAttendanceRate,
      },
      schools: formatPaginatedResponse([], page, perPage, schoolsCount),
    };
  }

  const schoolIds = schools.map((s) => s.schoolId);

  // ✅ Count only this org's students
  const studentCounts = await this.studentRepo
    .createQueryBuilder('student')
    .select('student.school_id', 'schoolId')
    .addSelect('COUNT(*)', 'count')
    .where('student.school_id IN (:...schoolIds)', { schoolIds })
.andWhere('student.registered_by_org_id = :organizationId', { organizationId })
    .groupBy('student.school_id')
    .getRawMany<StudentCountRaw>();

  const studentCountMap: Record<string, number> = Object.fromEntries(
    studentCounts.map((r): [string, number] => [r.schoolId, Number(r.count)]),
  );

  // ✅ Attendance for this org's students only
  const attendanceStats = await this.attendanceRepo
    .createQueryBuilder('a')
    .select('a.school_id', 'schoolId')
    .addSelect(
      `SUM(CASE WHEN a.status = :present THEN 1 ELSE 0 END)::float / COUNT(*) * 100`,
      'attendanceRate',
    )
    .where('a.school_id IN (:...schoolIds)', { schoolIds })
    .andWhere('a.organization_id = :organizationId', { organizationId })
    .setParameter('present', AttendanceStatus.PRESENT)
    .groupBy('a.school_id')
    .getRawMany<AttendanceRateRaw>();

  const attendanceRateMap: Record<string, number> = Object.fromEntries(
    attendanceStats.map((r): [string, number] => [
      r.schoolId,
      Number(r.attendanceRate ?? 0),
    ]),
  );

  const sortedRates: number[] = Object.values(attendanceRateMap).sort(
    (a, b) => a - b,
  );

  const performanceRank = (rate: number): number => {
    if (!sortedRates.length) return 0;
    const below = sortedRates.filter((r) => r <= rate).length;
    return Math.round((below / sortedRates.length) * 100);
  };

  const schoolItems = schools.map((school) => {
    const attendanceRate = attendanceRateMap[school.schoolId] ?? 0;

    return {
      schoolId: school.schoolId,
      schoolName: school.name,
      state: school.state,
      country: school.country,
      code: school.code,
      logoUrl:school.logoUrl,
      radiusMeters: school.radiusMeters,
      latitude: school.latitude,
      longitude: school.longitude,
      isActive: school.isActive,
      schoolType: school.schoolType,
      city: school.city,
      town: school.town,
      totalStudents: studentCountMap[school.schoolId] ?? 0,
      attendanceRate: Number(attendanceRate.toFixed(2)),
      performanceRank: performanceRank(attendanceRate),
    };
  });

  return {
    stats: {
      totalSchools,
      totalStudents,
      avgAttendanceRate,
      avgPerformance: avgAttendanceRate,
    },
    schools: formatPaginatedResponse(
      schoolItems,
      page,
      perPage,
      schoolsCount,
      'Success',
    ),
  };
}

  // ==================== SUPER ADMIN: Get Global School Details ====================
  /**
   * Super Admin retrieves any school details (no org check)
   */
  async getGlobalSchoolDetails(schoolId: string) {
    const school = await this.schoolRepository.findOne({
      where: { schoolId, isActive: true },
    });

    if (!school) {
      throw new NotFoundException(SchoolMessages.SCHOOL_NOT_FOUND);
    }

    // Get count of orgs using this school
    const organizationsUsing = await this.orgSchoolRepo.count({
      where: { schoolId, isActive: true },
    });

    // Get all classes for this school
    const classes = await this.classRepo.find({
      where: { schoolId, isActive: true },
      order: { hierarchyLevel: 'ASC' },
    });

    // Get total students across ALL orgs for this school
    const totalStudents = await this.studentRepo.count({
      where: { schoolId },
    });

    const classIds = classes.map((c) => c.classId);

    // Get student counts per class (across all orgs)
    const classStudentCounts = classIds.length
      ? await this.studentRepo
          .createQueryBuilder('student')
          .select('student.class_id', 'classId')
          .addSelect('COUNT(*)', 'count')
          .where('student.class_id IN (:...classIds)', { classIds })
          .groupBy('student.class_id')
          .getRawMany<ClassStudentCountRaw>()
      : [];

    const classStudentCountMap: Record<string, number> = Object.fromEntries(
      classStudentCounts.map((r): [string, number] => [
        r.classId,
        Number(r.count),
      ]),
    );

    const classItems = classes.map((cls) => ({
      classId: cls.classId,
      className: cls.className,
      hierarchyLevel: cls.hierarchyLevel,
      isTerminal: cls.isTerminal,
      isActive: cls.isActive,
      totalStudents: classStudentCountMap[cls.classId] ?? 0,
    }));

    return {
      message: 'School details retrieved',
      data: {
        schoolId: school.schoolId,
        name: school.name,
        code: school.code,
        address: school.address,
        state: school.state,
        country: school.country,
        city: school.city,
        town: school.town,
        latitude: school.latitude,
        longitude: school.longitude,
        schoolType: school.schoolType,
        radiusMeters: school.radiusMeters,
        contactPerson: school.contactPerson,
        contactPhone: school.contactPhone,
        logoUrl: school.logoUrl,
        attendanceModes: school.attendanceModes,
        isActive: school.isActive,
        createdAt: school.createdAt,
        organizationsUsing, // ✅ Super Admin specific field
        totalStudents, // ✅ Across all orgs
        classes: classItems,
      },
    };
  }
  // ==================== ORG ADMIN: Get School Details (If Has Access) ====================
  async retrieveSchoolDetails(
    organizationId: string,
    schoolId: string,
  ): Promise<FormatSchoolDetailsResponse> {
    // ✅ CHANGED: Check access through junction table
    const hasAccess = await this.orgSchoolRepo.findOne({
      where: {
        organizationId,
        schoolId,
        isActive: true,
      },
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this school. Please add it to your organization first.',
      );
    }

    const school = await this.schoolRepository.findOne({
      where: {
        schoolId,
        isActive: true,
      },
    });

    if (!school) {
      throw new NotFoundException(SchoolMessages.SCHOOL_NOT_FOUND);
    }

    const classes = await this.classRepo.find({
      where: { schoolId, isActive: true },
      order: { hierarchyLevel: 'ASC' },
    });

    const classIds = classes.map((c) => c.classId);

    // ✅ CHANGED: Count only this org's students
    const classStudentCounts = classIds.length
      ? await this.studentRepo
          .createQueryBuilder('student')
          .select('student.class_id', 'classId')
          .addSelect('COUNT(*)', 'count')
          .where('student.class_id IN (:...classIds)', { classIds })
         .andWhere('student.registered_by_org_id = :organizationId', { organizationId })

          .groupBy('student.class_id')
          .getRawMany<ClassStudentCountRaw>()
      : [];

    const classStudentCountMap: Record<string, number> = Object.fromEntries(
      classStudentCounts.map((r): [string, number] => [
        r.classId,
        Number(r.count),
      ]),
    );

    const currentCalendar = await this.calendarRepo.findOne({
      where: { schoolId, isCurrent: true }, // ✅ Calendar is org-specific
    });

    const classItems = classes.map((cls) => ({
      classId: cls.classId,
      className: cls.className,
      hierarchyLevel: cls.hierarchyLevel,
      isTerminal: cls.isTerminal,
      isActive: cls.isActive,
      totalStudents: classStudentCountMap[cls.classId] ?? 0, // ✅ Only this org's students
    }));

    return {
      message: SchoolMessages.SCHOOL_DETAILS_RETRIEVED,
      data: {
        schoolId: school.schoolId,
        name: school.name,
        code: school.code,
        address: school.address,
        state: school.state,
        country: school.country,
        city: school.city,
        town: school.town,
        latitude: school.latitude,
        longitude: school.longitude,
        schoolType: school.schoolType,
        radiusMeters: school.radiusMeters,
        contactPerson: school.contactPerson,
        contactPhone: school.contactPhone,
        logoUrl: school.logoUrl,
        attendanceModes: school.attendanceModes,
        isActive: school.isActive,
        createdAt: school.createdAt,

        currentCalendar: currentCalendar
          ? {
              calendarId: currentCalendar.calendarId,
              termName: currentCalendar.termName,
              startDate: currentCalendar.startDate,
              endDate: currentCalendar.endDate,
            }
          : undefined,

        classes: classItems,
      },
    };
  }

  // ==================== SUPER ADMIN: Delete/Update Global School ====================
  async deleteGlobalSchool(schoolId: string) {
    const school = await this.schoolRepository.findOne({
      where: { schoolId },
    });

    if (!school) {
      throw new NotFoundException(SchoolMessages.SCHOOL_NOT_FOUND);
    }

    // Check if any orgs are using this school
    const orgsUsing = await this.orgSchoolRepo.count({
      where: { schoolId, isActive: true },
    });

    if (orgsUsing > 0) {
      throw new ConflictException(
        `Cannot delete school. ${orgsUsing} organization(s) are currently using it.`,
      );
    }

    await this.schoolRepository.remove(school);

    return { message: 'School deleted successfully' };
  }

  async updateGlobalSchool(schoolId: string, dto: UpdateSchoolDto) {
    const school = await this.schoolRepository.findOne({
      where: { schoolId },
    });

    if (!school) {
      throw new NotFoundException(SchoolMessages.SCHOOL_NOT_FOUND);
    }

    const updatedSchool = this.schoolRepository.merge(school, dto);
    await this.schoolRepository.save(updatedSchool);

    return {
      message: 'School updated successfully',
    };
  }

  async toggleSchoolStatus(schoolId: string, isActive: boolean) {
    const school = await this.schoolRepository.findOne({
      where: { schoolId },
    });

    if (!school) {
      throw new NotFoundException(SchoolMessages.SCHOOL_NOT_FOUND);
    }

    school.isActive = isActive;
    await this.schoolRepository.save(school);

    return {
      message: `School ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async isSchoolActive(schoolId: string): Promise<boolean> {
    const school = await this.schoolRepository.findOne({
      where: { schoolId },
      select: ['isActive'],
    });
    return school?.isActive ?? false;
  }

  // ✅ NEW: Helper method - check if org has access to school
  async hasOrgAccessToSchool(
    organizationId: string,
    schoolId: string,
  ): Promise<boolean> {
    const access = await this.orgSchoolRepo.findOne({
      where: { organizationId, schoolId, isActive: true },
    });
    return !!access;
  }
}
