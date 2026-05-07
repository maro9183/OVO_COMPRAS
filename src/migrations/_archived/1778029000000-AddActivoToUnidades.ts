import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivoToUnidades1778029000000 implements MigrationInterface {
    name = 'AddActivoToUnidades1778029000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "unidades" ADD "activo" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "unidades" DROP COLUMN "activo"`);
    }
}
