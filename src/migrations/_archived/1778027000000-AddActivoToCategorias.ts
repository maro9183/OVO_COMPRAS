import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivoToCategorias1778027000000 implements MigrationInterface {
    name = 'AddActivoToCategorias1778027000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categorias" ADD "activo" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categorias" DROP COLUMN "activo"`);
    }
}
