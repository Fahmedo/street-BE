import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database-config';
import appConfig from './config/app.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationModule } from './organization/organization.module';
import { AdminUserModule } from './admin-user/admin-user.module';
import { SchoolModule } from './school/school.module';
import { StudentProfileModule } from './student-profile/student-profile.module';
import { StudentAttendanceModule } from './student-attendance/student-attendance.module';
import { OrganizationUserModule } from './organization-user/organization-user.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SchoolCalendarModule } from './school-calendar/school-calendar.module';
import { InterventionModule } from './intervention/intervention.module';
import { DemographicsModule } from './demographics/demographics.module';
import { RewardsModule } from './rewardProgramme/rewards.module';
import { WeatherModule } from './weather/weather.module';
import { AuditModule } from './audit/audit.module';
import { MentorModule } from './mentor/mentor.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './authorization/guards/roles.guard'; // ✅ CHANGE 1: Import from authorization module
import { OrgAdminReportsModule } from './orgadmin-reports/orgadmin-reports.module';
import { MentorOverviewModule } from './mentor-overview/mentor-overview.module';
import { OrganizationOverviewModule } from './organization-overview/organization-overview.module';
import { PlatformOverviewModule } from './platform-overview/platform-overview.module';
import { EmailModule } from './config/email/email.module';
import { PlatformAnalyticsModule } from './platform-analytics/platform-analytics.module';
import { PlatformDemographicsModule } from './platform-demographics/platform-demographics.module';
import { SystemHealthModule } from './platform-systemhealth/system-health.module';
import { PlatformReportsModule } from './platform-reports/platform-reports.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrganizationSchoolModule } from './organization-school/organization-school.module';

import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<'postgres'>('database.type'),
        url: configService.get<string>('database.url'),
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        synchronize: configService.get<boolean>('database.synchronize'),
        autoLoadEntities: true,
        ssl: configService.get<boolean>('database.ssl'),
        keepConnectionAlive: true,
        retryAttempts: 5,
        retryDelay: 2000,
        extra: {
          connectionTimeoutMillis: 20000,
          idleTimeoutMillis: 20000,
          max: 10,
        },
      }),
    }),
    AuthModule, // ✅ CHANGE 2: Move AuthModule before AuthorizationModule
    AuthorizationModule, // ✅ Keep this (already there)
    OrganizationModule,
    AdminUserModule,
    SchoolModule,
    StudentProfileModule,
    StudentAttendanceModule,
    OrganizationUserModule,
    PromotionsModule,
    EventEmitterModule.forRoot(),
    AuditModule,
    MentorModule,
    SchoolCalendarModule,
    InterventionModule,
    DemographicsModule,
    RewardsModule,
    WeatherModule,
    OrgAdminReportsModule,
    MentorOverviewModule,
    OrganizationOverviewModule,
    PlatformOverviewModule,
    EmailModule,
    PlatformAnalyticsModule,
    PlatformDemographicsModule,
    SystemHealthModule,
    PlatformReportsModule,
    OrganizationSchoolModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
