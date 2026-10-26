// src/weather/weather.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { SchoolWeatherImpact } from './entities/school-weather-impact.entity';
import { School } from '../school/entities/school.entity';
import { StudentAttendanceRecord } from '../student-attendance/entities/student-attendance.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      SchoolWeatherImpact,
      School,
      StudentAttendanceRecord,
    ]),
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}