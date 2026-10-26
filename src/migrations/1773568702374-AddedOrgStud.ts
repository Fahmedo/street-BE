import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedOrgStud1773568702374 implements MigrationInterface {
    name = 'AddedOrgStud1773568702374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_de6ad4ae6936dce474e2823984e"`);
        await queryRunner.query(`ALTER TABLE "classes" RENAME COLUMN "head_teacher_id" TO "head_teacher"`);
        await queryRunner.query(`ALTER TABLE "organization_students" DROP COLUMN "assigned_mentor_id"`);
        await queryRunner.query(`ALTER TABLE "students" ADD "student_code" text`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "UQ_94ea28a151d5f49f6bd4833466c" UNIQUE ("student_code")`);
        
           await queryRunner.query(`
            UPDATE "students" 
            SET "registered_by_org_id" = "student_id"
            WHERE "registered_by_org_id" IS NULL;
        `);
        
        await queryRunner.query(`ALTER TABLE "weather_cache" ALTER COLUMN "cache_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "weather_cache" ALTER COLUMN "cache_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_90cbe8b6aa0e521e5534c6dbb00"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_d9d584dd726b7241b00578f2aa2"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_01cd5ef6688c6aa75becdbe0b26"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_305d4e6438f86fcea8e4da731f1"`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" DROP CONSTRAINT "FK_0b6b53f518aa082f3e4fc71d317"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_7ddaa3b6a8249b17df6f814643a"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_f409e4840b0aa6c3331df0ab11f"`);
        await queryRunner.query(`ALTER TABLE "organization_users" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_47287e5cbe6d348f2fe0e859f66"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_d6846a4d8b2307a63cb9c883fe6"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_c19f8af84f242ceab0d034cb10a"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendar_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendar_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_277ca0d959859d75e90e561556c"`);
        await queryRunner.query(`ALTER TABLE "organization_users" DROP CONSTRAINT "FK_26f83117dea41b00841385b9821"`);
        await queryRunner.query(`ALTER TABLE "organization_schools" DROP CONSTRAINT "FK_a5e14adcfa0b476c5532c0a9239"`);
        await queryRunner.query(`ALTER TABLE "organization_students" DROP CONSTRAINT "FK_2070e06e2092de8e857dbbecfe9"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" DROP CONSTRAINT "FK_2c0b9e845522184bddd373d8288"`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" DROP CONSTRAINT "FK_636520893532e8b9eddb59d42ba"`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "organization_students" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_students" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_f00d7c9e23bd1f897e91e30e896"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_616bb16a2ff6bbf26a0c6653a17"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_c829a1cce1b106809976ee2135e"`);
        await queryRunner.query(`ALTER TABLE "organization_students" DROP CONSTRAINT "FK_c995d0b9477adad4409c6c6f114"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_bc6b114377187116320ea7cc5d6"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_dbace05c012526710663f8d8911"`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "student_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "student_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "UQ_ac3da37754c128790b845de7a47"`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "registered_by_org_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_69596ed78b2f29ba1be3ff386ca"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_f5e66c09752af5dadcc0572643f"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_e32589702493d4462f61c7602e7"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_cc48ccbd03396874857ab06ac3b"`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "class_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "class_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "head_teacher"`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "head_teacher" text`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_3aafbb83eb7797415454c34b380"`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" DROP CONSTRAINT "FK_845d9085ef1668d961fa3ba1f9e"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_e69b1b3bd0f70c3495f2be508a7"`);
        await queryRunner.query(`ALTER TABLE "organization_users" DROP CONSTRAINT "FK_0f293bc939ba36c1984c6397b9b"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_23b79b137e6bb3a2e50c9cac73d"`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" DROP CONSTRAINT "FK_a4d7facfeffc4b7ddf7dd3f9c71"`);
        await queryRunner.query(`ALTER TABLE "organization_schools" DROP CONSTRAINT "FK_9938dca21655422344cbbef8b0a"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_398f3990f5da4a1efda173f576f"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" DROP CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_aa8edc7905ad764f85924569647"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_b4f3153661f98d42ae8355153b4"`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" DROP CONSTRAINT "FK_998af30cde3fcb7a136df13ef11"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_5ade718880c9f245516bc1014a1"`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "school_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "school_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" ALTER COLUMN "impact_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" ALTER COLUMN "impact_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" DROP CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b"`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" DROP CONSTRAINT "FK_d13d5482dfd039ac75652946e67"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "reward_settings" ALTER COLUMN "programme_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reward_settings" ALTER COLUMN "programme_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ALTER COLUMN "issuance_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ALTER COLUMN "issuance_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_81be8f09ef8d5fabb80c426131f"`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" DROP CONSTRAINT "FK_e864ae6730f1f49975b182dee74"`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" ALTER COLUMN "programme_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" ALTER COLUMN "programme_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "promotions" ALTER COLUMN "promotion_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "promotions" ALTER COLUMN "promotion_id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_students_national_id" ON "students" ("national_id") WHERE national_id IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_unique_active_student_mentor" ON "mentor_assignments" ("mentor_id", "student_id", "is_active") WHERE scope = 'student' AND is_active = true AND student_id IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_unique_active_class_mentor" ON "mentor_assignments" ("mentor_id", "class_id", "is_active") WHERE scope = 'class' AND is_active = true AND class_id IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_unique_active_school_mentor" ON "mentor_assignments" ("mentor_id", "school_id", "is_active") WHERE scope = 'school' AND is_active = true AND school_id IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ADD CONSTRAINT "FK_0b6b53f518aa082f3e4fc71d317" FOREIGN KEY ("userId") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ADD CONSTRAINT "FK_a4d7facfeffc4b7ddf7dd3f9c71" FOREIGN KEY ("schoolId") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_users" ADD CONSTRAINT "FK_26f83117dea41b00841385b9821" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_users" ADD CONSTRAINT "FK_0f293bc939ba36c1984c6397b9b" FOREIGN KEY ("schoolId") REFERENCES "schools"("school_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_2c0b9e845522184bddd373d8288" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ADD CONSTRAINT "FK_a5e14adcfa0b476c5532c0a9239" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ADD CONSTRAINT "FK_9938dca21655422344cbbef8b0a" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_students" ADD CONSTRAINT "FK_2070e06e2092de8e857dbbecfe9" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_students" ADD CONSTRAINT "FK_c995d0b9477adad4409c6c6f114" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_aa8edc7905ad764f85924569647" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_de6ad4ae6936dce474e2823984e" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_398f3990f5da4a1efda173f576f" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" ADD CONSTRAINT "FK_845d9085ef1668d961fa3ba1f9e" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ADD CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ADD CONSTRAINT "FK_d13d5482dfd039ac75652946e67" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_c19f8af84f242ceab0d034cb10a" FOREIGN KEY ("calendar_id") REFERENCES "school_calendar"("calendar_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_5ade718880c9f245516bc1014a1" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_cc48ccbd03396874857ab06ac3b" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_dbace05c012526710663f8d8911" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_f409e4840b0aa6c3331df0ab11f" FOREIGN KEY ("marked_by_user_id") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_81be8f09ef8d5fabb80c426131f" FOREIGN KEY ("programme_id") REFERENCES "reward_programmes"("programme_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_b4f3153661f98d42ae8355153b4" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_bc6b114377187116320ea7cc5d6" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_d6846a4d8b2307a63cb9c883fe6" FOREIGN KEY ("calendar_id") REFERENCES "school_calendar"("calendar_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_7ddaa3b6a8249b17df6f814643a" FOREIGN KEY ("approved_by") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" ADD CONSTRAINT "FK_636520893532e8b9eddb59d42ba" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" ADD CONSTRAINT "FK_e864ae6730f1f49975b182dee74" FOREIGN KEY ("programme_id") REFERENCES "reward_programmes"("programme_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" ADD CONSTRAINT "FK_998af30cde3fcb7a136df13ef11" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_277ca0d959859d75e90e561556c" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_3aafbb83eb7797415454c34b380" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_f00d7c9e23bd1f897e91e30e896" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_69596ed78b2f29ba1be3ff386ca" FOREIGN KEY ("from_class_id") REFERENCES "classes"("class_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_f5e66c09752af5dadcc0572643f" FOREIGN KEY ("to_class_id") REFERENCES "classes"("class_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_90cbe8b6aa0e521e5534c6dbb00" FOREIGN KEY ("mentor_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_e69b1b3bd0f70c3495f2be508a7" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_e32589702493d4462f61c7602e7" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_616bb16a2ff6bbf26a0c6653a17" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_d9d584dd726b7241b00578f2aa2" FOREIGN KEY ("assigned_by") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_47287e5cbe6d348f2fe0e859f66" FOREIGN KEY ("calendar_id") REFERENCES "school_calendar"("calendar_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_305d4e6438f86fcea8e4da731f1" FOREIGN KEY ("mentor_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_c829a1cce1b106809976ee2135e" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_23b79b137e6bb3a2e50c9cac73d" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_01cd5ef6688c6aa75becdbe0b26" FOREIGN KEY ("created_by") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_01cd5ef6688c6aa75becdbe0b26"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_23b79b137e6bb3a2e50c9cac73d"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_c829a1cce1b106809976ee2135e"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_305d4e6438f86fcea8e4da731f1"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_47287e5cbe6d348f2fe0e859f66"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_d9d584dd726b7241b00578f2aa2"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_616bb16a2ff6bbf26a0c6653a17"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_e32589702493d4462f61c7602e7"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_e69b1b3bd0f70c3495f2be508a7"`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" DROP CONSTRAINT "FK_90cbe8b6aa0e521e5534c6dbb00"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_f5e66c09752af5dadcc0572643f"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_69596ed78b2f29ba1be3ff386ca"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_f00d7c9e23bd1f897e91e30e896"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_3aafbb83eb7797415454c34b380"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_277ca0d959859d75e90e561556c"`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" DROP CONSTRAINT "FK_998af30cde3fcb7a136df13ef11"`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" DROP CONSTRAINT "FK_e864ae6730f1f49975b182dee74"`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" DROP CONSTRAINT "FK_636520893532e8b9eddb59d42ba"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_7ddaa3b6a8249b17df6f814643a"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_d6846a4d8b2307a63cb9c883fe6"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_bc6b114377187116320ea7cc5d6"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_b4f3153661f98d42ae8355153b4"`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" DROP CONSTRAINT "FK_81be8f09ef8d5fabb80c426131f"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_f409e4840b0aa6c3331df0ab11f"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_dbace05c012526710663f8d8911"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_cc48ccbd03396874857ab06ac3b"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_5ade718880c9f245516bc1014a1"`);
        await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_c19f8af84f242ceab0d034cb10a"`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" DROP CONSTRAINT "FK_d13d5482dfd039ac75652946e67"`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" DROP CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b"`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" DROP CONSTRAINT "FK_845d9085ef1668d961fa3ba1f9e"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_398f3990f5da4a1efda173f576f"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_de6ad4ae6936dce474e2823984e"`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "FK_aa8edc7905ad764f85924569647"`);
        await queryRunner.query(`ALTER TABLE "organization_students" DROP CONSTRAINT "FK_c995d0b9477adad4409c6c6f114"`);
        await queryRunner.query(`ALTER TABLE "organization_students" DROP CONSTRAINT "FK_2070e06e2092de8e857dbbecfe9"`);
        await queryRunner.query(`ALTER TABLE "organization_schools" DROP CONSTRAINT "FK_9938dca21655422344cbbef8b0a"`);
        await queryRunner.query(`ALTER TABLE "organization_schools" DROP CONSTRAINT "FK_a5e14adcfa0b476c5532c0a9239"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" DROP CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e"`);
        await queryRunner.query(`ALTER TABLE "school_calendar" DROP CONSTRAINT "FK_2c0b9e845522184bddd373d8288"`);
        await queryRunner.query(`ALTER TABLE "organization_users" DROP CONSTRAINT "FK_0f293bc939ba36c1984c6397b9b"`);
        await queryRunner.query(`ALTER TABLE "organization_users" DROP CONSTRAINT "FK_26f83117dea41b00841385b9821"`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" DROP CONSTRAINT "FK_a4d7facfeffc4b7ddf7dd3f9c71"`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" DROP CONSTRAINT "FK_0b6b53f518aa082f3e4fc71d317"`);
        await queryRunner.query(`DROP INDEX "public"."idx_unique_active_school_mentor"`);
        await queryRunner.query(`DROP INDEX "public"."idx_unique_active_class_mentor"`);
        await queryRunner.query(`DROP INDEX "public"."idx_unique_active_student_mentor"`);
        await queryRunner.query(`DROP INDEX "public"."idx_students_national_id"`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "admin_users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "interventions" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "promotions" ALTER COLUMN "promotion_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "promotions" ALTER COLUMN "promotion_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" ALTER COLUMN "programme_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" ALTER COLUMN "programme_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" ADD CONSTRAINT "FK_e864ae6730f1f49975b182dee74" FOREIGN KEY ("programme_id") REFERENCES "reward_programmes"("programme_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_81be8f09ef8d5fabb80c426131f" FOREIGN KEY ("programme_id") REFERENCES "reward_programmes"("programme_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ALTER COLUMN "issuance_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ALTER COLUMN "issuance_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "reward_settings" ALTER COLUMN "programme_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reward_settings" ALTER COLUMN "programme_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ALTER COLUMN "attendanceId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ADD CONSTRAINT "FK_d13d5482dfd039ac75652946e67" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ADD CONSTRAINT "FK_56d6dcd9fcf661c2d324530ea8b" FOREIGN KEY ("attendanceAttendanceId") REFERENCES "attendance_records"("attendanceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_photos" ALTER COLUMN "photoId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_gps_logs" ALTER COLUMN "gpsId" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" ALTER COLUMN "impact_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" ALTER COLUMN "impact_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "school_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "schools" ALTER COLUMN "school_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_5ade718880c9f245516bc1014a1" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_programme_schools" ADD CONSTRAINT "FK_998af30cde3fcb7a136df13ef11" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_b4f3153661f98d42ae8355153b4" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_aa8edc7905ad764f85924569647" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_04cacc855763debaeaeb4f8e30e" FOREIGN KEY ("schoolSchoolId") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_398f3990f5da4a1efda173f576f" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ADD CONSTRAINT "FK_9938dca21655422344cbbef8b0a" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ADD CONSTRAINT "FK_a4d7facfeffc4b7ddf7dd3f9c71" FOREIGN KEY ("schoolId") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_23b79b137e6bb3a2e50c9cac73d" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_users" ADD CONSTRAINT "FK_0f293bc939ba36c1984c6397b9b" FOREIGN KEY ("schoolId") REFERENCES "schools"("school_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_e69b1b3bd0f70c3495f2be508a7" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_weather_impacts" ADD CONSTRAINT "FK_845d9085ef1668d961fa3ba1f9e" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_3aafbb83eb7797415454c34b380" FOREIGN KEY ("school_id") REFERENCES "schools"("school_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "head_teacher"`);
        await queryRunner.query(`ALTER TABLE "classes" ADD "head_teacher" uuid`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "class_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "classes" ALTER COLUMN "class_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_cc48ccbd03396874857ab06ac3b" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_e32589702493d4462f61c7602e7" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_f5e66c09752af5dadcc0572643f" FOREIGN KEY ("to_class_id") REFERENCES "classes"("class_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_69596ed78b2f29ba1be3ff386ca" FOREIGN KEY ("from_class_id") REFERENCES "classes"("class_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "registered_by_org_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "UQ_ac3da37754c128790b845de7a47" UNIQUE ("national_id")`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "student_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "student_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_dbace05c012526710663f8d8911" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_bc6b114377187116320ea7cc5d6" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_students" ADD CONSTRAINT "FK_c995d0b9477adad4409c6c6f114" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_c829a1cce1b106809976ee2135e" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_616bb16a2ff6bbf26a0c6653a17" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_f00d7c9e23bd1f897e91e30e896" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_students" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_students" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organizations" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "reward_programmes" ADD CONSTRAINT "FK_636520893532e8b9eddb59d42ba" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ADD CONSTRAINT "FK_2c0b9e845522184bddd373d8288" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_students" ADD CONSTRAINT "FK_2070e06e2092de8e857dbbecfe9" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ADD CONSTRAINT "FK_a5e14adcfa0b476c5532c0a9239" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_users" ADD CONSTRAINT "FK_26f83117dea41b00841385b9821" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_277ca0d959859d75e90e561556c" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_schools" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendar_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "school_calendar" ALTER COLUMN "calendar_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_c19f8af84f242ceab0d034cb10a" FOREIGN KEY ("calendar_id") REFERENCES "school_calendar"("calendar_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_d6846a4d8b2307a63cb9c883fe6" FOREIGN KEY ("calendar_id") REFERENCES "school_calendar"("calendar_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_47287e5cbe6d348f2fe0e859f66" FOREIGN KEY ("calendar_id") REFERENCES "school_calendar"("calendar_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_users" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_f409e4840b0aa6c3331df0ab11f" FOREIGN KEY ("marked_by_user_id") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_issuances" ADD CONSTRAINT "FK_7ddaa3b6a8249b17df6f814643a" FOREIGN KEY ("approved_by") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ADD CONSTRAINT "FK_0b6b53f518aa082f3e4fc71d317" FOREIGN KEY ("userId") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_305d4e6438f86fcea8e4da731f1" FOREIGN KEY ("mentor_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_01cd5ef6688c6aa75becdbe0b26" FOREIGN KEY ("created_by") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_d9d584dd726b7241b00578f2aa2" FOREIGN KEY ("assigned_by") REFERENCES "organization_users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mentor_assignments" ADD CONSTRAINT "FK_90cbe8b6aa0e521e5534c6dbb00" FOREIGN KEY ("mentor_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "organization_user_schools" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "weather_cache" ALTER COLUMN "cache_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "weather_cache" ALTER COLUMN "cache_id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT "UQ_94ea28a151d5f49f6bd4833466c"`);
        await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "student_code"`);
        await queryRunner.query(`ALTER TABLE "organization_students" ADD "assigned_mentor_id" uuid`);
        await queryRunner.query(`ALTER TABLE "classes" RENAME COLUMN "head_teacher" TO "head_teacher_id"`);
        await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_de6ad4ae6936dce474e2823984e" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }


    private async backfillStudentCodes(queryRunner: QueryRunner): Promise<void> {
        // Get all distinct schools that have students
        const schools = await queryRunner.query(`
            SELECT DISTINCT school_id 
            FROM students 
            WHERE student_code IS NULL
        `);

        for (const { school_id } of schools) {
            // Get school code and name
            const [school] = await queryRunner.query(
                `SELECT code, name FROM schools WHERE school_id = $1`,
                [school_id]
            );

            if (!school) continue;

            // Extract school code part
            const schoolCodePart = school.code
                ? school.code.split('-').slice(1, 2).join('').substring(0, 5)
                : school.name
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .substring(0, 5)
                    .toUpperCase();

            // Get all students for this school without codes
            const students = await queryRunner.query(
                `SELECT student_id FROM students 
                 WHERE school_id = $1 AND student_code IS NULL 
                 ORDER BY created_at ASC`,
                [school_id]
            );

            // Generate sequential codes
            for (let i = 0; i < students.length; i++) {
                const studentCode = `SCH-${schoolCodePart}-S-${(i + 1).toString().padStart(4, '0')}`;
                
                await queryRunner.query(
                    `UPDATE students SET student_code = $1 WHERE student_id = $2`,
                    [studentCode, students[i].student_id]
                );
            }
        }}

}
