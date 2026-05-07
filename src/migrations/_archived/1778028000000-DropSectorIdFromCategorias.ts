import { MigrationInterface, QueryRunner } from "typeorm";

export class DropSectorIdFromCategorias1778028000000 implements MigrationInterface {
    name = 'DropSectorIdFromCategorias1778028000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the unique constraint first if it exists
        await queryRunner.query(`ALTER TABLE "categorias" DROP CONSTRAINT IF EXISTS "categorias_sector_id_nombre_key"`);
        // Drop the column
        await queryRunner.query(`ALTER TABLE "categorias" DROP COLUMN IF EXISTS "sector_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categorias" ADD "sector_id" integer`);
    }
}
