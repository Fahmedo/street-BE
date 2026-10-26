import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../../school/entities/school-class.entity';
import { School } from '../../school/entities/school.entity';
import { OrganizationSchool } from '../../organization-school/entities/organization-school.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Role } from 'src/common/enum/roles.enum'; // ✅ Add this

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,

    @InjectRepository(OrganizationSchool)
    private readonly orgSchoolRepo: Repository<OrganizationSchool>,
  ) {}

  /**
   * ✅ Helper: Verify access to school (org admins only)
   */
  private async verifySchoolAccess(
    userRole: string,
    organizationId: string | null,
    schoolId: string,
  ): Promise<void> {
    // Super admin has access to all schools
    if (userRole === Role.SUPER_ADMIN) {
      return;
    }

    // Org admin must have access through org-school link
    if (!organizationId) {
      throw new ForbiddenException('Organization ID required for this operation');
    }

    const orgSchool = await this.orgSchoolRepo.findOne({
      where: {
        organizationId,
        schoolId,
        isActive: true,
      },
    });

    if (!orgSchool) {
      throw new ForbiddenException(
        'Your organization does not have access to this school',
      );
    }
  }

  /**
   * Create a new class (Super Admin only)
   */
  async createClass(
    userId: string,
    schoolId: string,
    dto: CreateClassDto,
  ) {
    // ✅ Verify school exists
    const school = await this.schoolRepo.findOne({
      where: { schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // ✅ Check if class with same name already exists in this school
    const existingClass = await this.classRepo.findOne({
      where: {
        schoolId,
        className: dto.className,
      },
    });

    if (existingClass) {
      throw new ConflictException(
        `Class '${dto.className}' already exists in this school`,
      );
    }

    // ✅ Create new class
    const newClass = this.classRepo.create({
      schoolId,
      className: dto.className,
      hierarchyLevel: dto.hierarchyLevel,
      isTerminal: dto.isTerminal ?? false,
      isActive: dto.isActive ?? true,
      headTeacher: dto.headTeacher,
      createdByUserId: userId, // Track super admin who created it
    });

    await this.classRepo.save(newClass);

    return {
      message: 'Class created successfully',
      data: newClass,
    };
  }

  /**
   * Get all classes for a school
   */
  async getClassesBySchool(
    userId: string,
    userRole: string,
    organizationId: string | null,
    schoolId: string,
  ) {
    // ✅ Verify access (super admin bypasses, org admin needs verification)
    await this.verifySchoolAccess(userRole, organizationId, schoolId);

    const classes = await this.classRepo.find({
      where: {
        schoolId,
      },
      order: { hierarchyLevel: 'ASC' },
    });

    return {
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get a specific class
   */
  async getClassById(
    userId: string,
    userRole: string,
    organizationId: string | null,
    schoolId: string,
    classId: string,
  ) {
    // ✅ Verify access
    await this.verifySchoolAccess(userRole, organizationId, schoolId);

    const classItem = await this.classRepo.findOne({
      where: {
        classId,
        schoolId,
      },
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    return {
      message: 'Class retrieved successfully',
      data: classItem,
    };
  }

  /**
   * Update a class (Super Admin only)
   */
  async updateClass(
    userId: string,
    schoolId: string,
    classId: string,
    dto: UpdateClassDto,
  ) {
    // Verify class exists and belongs to the school
    const classItem = await this.classRepo.findOne({
      where: {
        classId,
        schoolId,
      },
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    // If className is being updated, check for duplicates
    if (dto.className && dto.className !== classItem.className) {
      const existingClass = await this.classRepo.findOne({
        where: {
          schoolId,
          className: dto.className,
        },
      });

      if (existingClass) {
        throw new ConflictException(
          `Class '${dto.className}' already exists in this school`,
        );
      }
    }

    // Merge and save updates
    const updatedClass = this.classRepo.merge(classItem, dto);
    await this.classRepo.save(updatedClass);

    return {
      message: 'Class updated successfully',
      data: updatedClass,
    };
  }

  /**
   * Delete a class (Super Admin only)
   */
  async deleteClass(
    userId: string,
    schoolId: string,
    classId: string,
  ) {
    // Verify class exists and belongs to the school
    const classItem = await this.classRepo.findOne({
      where: {
        classId,
        schoolId,
      },
      relations: ['students'],
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    // ✅ Prevent deletion if class has students
    if (classItem.students && classItem.students.length > 0) {
      throw new ConflictException(
        `Cannot delete class '${classItem.className}' because it has ${classItem.students.length} student(s). Please reassign or remove the students first.`,
      );
    }

    await this.classRepo.remove(classItem);

    return {
      message: 'Class deleted successfully',
    };
  }

  /**
   * Get class with students
   */
  async getClassWithStudents(
    userId: string,
    userRole: string,
    organizationId: string | null,
    schoolId: string,
    classId: string,
  ) {
    // ✅ Verify access
    await this.verifySchoolAccess(userRole, organizationId, schoolId);

    const classItem = await this.classRepo.findOne({
      where: {
        classId,
        schoolId,
      },
      relations: ['students', 'students.school'],
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    return {
      message: 'Class with students retrieved successfully',
      data: {
        ...classItem,
        studentCount: classItem.students?.length ?? 0,
      },
    };
  }

  /**
   * Get total count of students in a class
   */
  async getClassStudentCount(
    userId: string,
    userRole: string,
    organizationId: string | null,
    schoolId: string,
    classId: string,
  ): Promise<number> {
    // ✅ Verify access
    await this.verifySchoolAccess(userRole, organizationId, schoolId);

    const classItem = await this.classRepo.findOne({
      where: {
        classId,
        schoolId,
      },
      relations: ['students'],
    });

    if (!classItem) {
      throw new NotFoundException('Class not found');
    }

    return classItem.students?.length ?? 0;
  }
}