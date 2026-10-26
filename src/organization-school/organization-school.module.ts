import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationSchoolService } from './organization-school.service';
import { OrganizationSchoolController } from './organization-school.controller';
import { OrganizationSchool } from './entities/organization-school.entity';
import { School } from '../school/entities/school.entity';
import { Organization } from '../organization/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationSchool,
      School,
      Organization,
    ]),
  ],
  controllers: [OrganizationSchoolController],
  providers: [OrganizationSchoolService],
  exports: [OrganizationSchoolService], 
})
export class OrganizationSchoolModule {}