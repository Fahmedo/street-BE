import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { School } from '../school/entities/school.entity';
import { Class } from '../school/entities/school-class.entity';
import { DemographicsService } from './demographics.service';
import { DemographicsController } from './demographics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentProfile, School, Class])],
  controllers: [DemographicsController],
  providers: [DemographicsService],
})
export class DemographicsModule {}