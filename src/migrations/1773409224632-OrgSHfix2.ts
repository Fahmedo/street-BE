import { MigrationInterface, QueryRunner } from "typeorm";

export class OrgSHfix21773409224632 implements MigrationInterface {
    name = 'OrgSHfix21773409224632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // This migration was a duplicate of OrgSHfix1773408983505 which already ran.
        // No-op to allow the migration table to mark this as complete.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op
    }
}