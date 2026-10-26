import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthRefactor1771952565192 implements MigrationInterface {
    name = 'AuthRefactor1771952565192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_user" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_user" DROP CONSTRAINT "FK_63562fe364ecc738a7be56a8444"`);
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
        await queryRunner.query(`ALTER TABLE "admin-user" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "admin-user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_user" ADD CONSTRAINT "FK_63562fe364ecc738a7be56a8444" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
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
        await queryRunner.query(`ALTER TABLE "organization_user" DROP CONSTRAINT "FK_63562fe364ecc738a7be56a8444"`);
        await queryRunner.query(`ALTER TABLE "admin-user" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "admin-user" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "studentId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "studentId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_4aa43c6c68237515ffa6b4f0a6c" FOREIGN KEY ("studentStudentId") REFERENCES "students"("studentId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "classId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "classId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_97530502e892d9ee9cd21e06910" FOREIGN KEY ("classClassId") REFERENCES "classes"("classId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_4b57887403e050be734f7d52611" FOREIGN KEY ("classClassId") REFERENCES "classes"("classId") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "schoolId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "schoolId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_4804224635a7905e7c67b453ccd" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_398f3990f5da4a1efda173f576f" FOREIGN KEY ("school_id") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_0623a5bfd11511630a6b1b573f1" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_ccedaf9dfa0503fa7b03b08d126" FOREIGN KEY ("school_id") REFERENCES "schools"("schoolId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "sessionId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "sessionId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_c51be2c1149e22de76b17626cb7" FOREIGN KEY ("session_id") REFERENCES "sessions"("sessionId") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ADD CONSTRAINT "FK_d13d5482dfd039ac75652946e67" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ADD CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendarId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendarId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_81808fd5719a7f5cb9cd4c770fc" FOREIGN KEY ("markedById") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schools" ADD CONSTRAINT "FK_42ef534f0b1efdbc6aece928cdd" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_user" ADD CONSTRAINT "FK_63562fe364ecc738a7be56a8444" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_user" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_user" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
    }

}
