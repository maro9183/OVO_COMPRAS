import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminRole1778024000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums cannot be updated within a transaction in Postgres usually
        // but we can try to add the value
        await queryRunner.query(`ALTER TYPE usuario_rol ADD VALUE IF NOT EXISTS 'ADMIN'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Removing a value from an enum is not straightforward in Postgres
    }
}
