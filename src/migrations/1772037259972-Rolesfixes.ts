import { MigrationInterface, QueryRunner } from "typeorm";

export class Rolesfixes1772037259972 implements MigrationInterface {
    name = 'Rolesfixes1772037259972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."organization_users_status_enum" AS ENUM('Pending', 'Active', 'Completed', 'Suspended')`);
        await queryRunner.query(`CREATE TABLE "organization_users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "schoolId" uuid, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "roles" text NOT NULL, "status" "public"."organization_users_status_enum" NOT NULL DEFAULT 'Pending', "passwordResetCode" character varying(6), "passwordResetCodeExpiresAt" TIMESTAMP, "passwordChangedAt" TIMESTAMP, "lastLogin" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1e5736b0e40136f7eccd656bb90" UNIQUE ("email"), CONSTRAINT "PK_af79a22d50256af35812ba60a87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."admin_users_status_enum" AS ENUM('Pending', 'Active', 'Completed', 'Suspended')`);
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "roles" text NOT NULL, "status" "public"."admin_users_status_enum" NOT NULL DEFAULT 'Active', "passwordResetCode" character varying(6), "passwordResetCodeExpiresAt" TIMESTAMP, "passwordChangedAt" TIMESTAMP, "lastLogin" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "schools" DROP CONSTRAINT "FK_42ef534f0b1efdbc6aece928cdd"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_81808fd5719a7f5cb9cd4c770fc"`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendarId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendarId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" DROP CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b"`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" DROP CONSTRAINT "FK_d13d5482dfd039ac75652946e67"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_c51be2c1149e22de76b17626cb7"`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "sessionId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "sessionId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_ccedaf9dfa0503fa7b03b08d126"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_0623a5bfd11511630a6b1b573f1"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_398f3990f5da4a1efda173f576f"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" DROP CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_4804224635a7905e7c67b453ccd"`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "schoolId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "schoolId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_4b57887403e050be734f7d52611"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_97530502e892d9ee9cd21e06910"`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "classId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "classId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_4aa43c6c68237515ffa6b4f0a6c"`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "studentId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "studentId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_users" ADD CONSTRAINT "FK_26f83117dea41b00841385b9821" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_users" ADD CONSTRAINT "FK_0f293bc939ba36c1984c6397b9b" FOREIGN KEY ("schoolId") REFERENCES "schools"("schoolId") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ADD CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ADD CONSTRAINT "FK_d13d5482dfd039ac75652946e67" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_c51be2c1149e22de76b17626cb7" FOREIGN KEY ("session_id") REFERENCES "sessions"("sessionId") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_4804224635a7905e7c67b453ccd" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_97530502e892d9ee9cd21e06910" FOREIGN KEY ("classClassId") REFERENCES "classes"("classId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_4aa43c6c68237515ffa6b4f0a6c" FOREIGN KEY ("studentStudentId") REFERENCES "students"("studentId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_81808fd5719a7f5cb9cd4c770fc" FOREIGN KEY ("markedById") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_ccedaf9dfa0503fa7b03b08d126" FOREIGN KEY ("school_id") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schools" ADD CONSTRAINT "FK_42ef534f0b1efdbc6aece928cdd" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_398f3990f5da4a1efda173f576f" FOREIGN KEY ("school_id") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_0623a5bfd11511630a6b1b573f1" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_4b57887403e050be734f7d52611" FOREIGN KEY ("classClassId") REFERENCES "classes"("classId") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_4b57887403e050be734f7d52611"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_0623a5bfd11511630a6b1b573f1"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_398f3990f5da4a1efda173f576f"`);
        await queryRunner.query(`ALTER TABLE "schools" DROP CONSTRAINT "FK_42ef534f0b1efdbc6aece928cdd"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_ccedaf9dfa0503fa7b03b08d126"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_81808fd5719a7f5cb9cd4c770fc"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_4aa43c6c68237515ffa6b4f0a6c"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_97530502e892d9ee9cd21e06910"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_4804224635a7905e7c67b453ccd"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_c51be2c1149e22de76b17626cb7"`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" DROP CONSTRAINT "FK_d13d5482dfd039ac75652946e67"`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" DROP CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" DROP CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e"`);
        await queryRunner.query(`ALTER TABLE "organization_users" DROP CONSTRAINT "FK_0f293bc939ba36c1984c6397b9b"`);
        await queryRunner.query(`ALTER TABLE "organization_users" DROP CONSTRAINT "FK_26f83117dea41b00841385b9821"`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "studentId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "studentId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_4aa43c6c68237515ffa6b4f0a6c" FOREIGN KEY ("studentStudentId") REFERENCES "students"("studentId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "classId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "classId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_97530502e892d9ee9cd21e06910" FOREIGN KEY ("classClassId") REFERENCES "classes"("classId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_4b57887403e050be734f7d52611" FOREIGN KEY ("classClassId") REFERENCES "classes"("classId") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "schoolId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "schoolId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_4804224635a7905e7c67b453ccd" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_398f3990f5da4a1efda173f576f" FOREIGN KEY ("school_id") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_0623a5bfd11511630a6b1b573f1" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_ccedaf9dfa0503fa7b03b08d126" FOREIGN KEY ("school_id") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "sessionId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "sessionId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_c51be2c1149e22de76b17626cb7" FOREIGN KEY ("session_id") REFERENCES "sessions"("sessionId") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ADD CONSTRAINT "FK_d13d5482dfd039ac75652946e67" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ADD CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendarId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendarId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_81808fd5719a7f5cb9cd4c770fc" FOREIGN KEY ("markedById") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schools" ADD CONSTRAINT "FK_42ef534f0b1efdbc6aece928cdd" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP TYPE "public"."admin_users_status_enum"`);
        await queryRunner.query(`DROP TABLE "organization_users"`);
        await queryRunner.query(`DROP TYPE "public"."organization_users_status_enum"`);
    }

}
