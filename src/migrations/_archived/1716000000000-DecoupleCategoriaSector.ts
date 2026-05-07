import { MigrationInterface, QueryRunner } from "typeorm";

export class DecoupleCategoriaSector1716000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE categorias DROP COLUMN IF EXISTS id_sector;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
