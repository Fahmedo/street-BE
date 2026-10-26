import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { Class } from '../../school/entities/school-class.entity';
import { School } from '../../school/entities/school.entity';
import { OrganizationSchool } from '../../organization-school/entities/organization-school.entity'; // ✅ Add this

@Module({
  imports: [TypeOrmModule.forFeature([Class, School,OrganizationSchool])],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}