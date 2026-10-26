import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from 'src/promotions/promotions.controller';
import { Promotion } from './entities/promotion.entity';
import { StudentProfile } from '../student-profile/entities/student-profile.entity';
import { Class } from '../school/entities/school-class.entity';
import { School } from '../school/entities/school.entity';
import { OrganizationSchool } from 'src/organization-school/entities/organization-school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, StudentProfile, Class, School,OrganizationSchool])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}