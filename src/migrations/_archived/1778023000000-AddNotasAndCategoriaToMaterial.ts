import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotasAndCategoriaToMaterial1778023000000 implements MigrationInterface {
    name = 'AddNotasAndCategoriaToMaterial1778023000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "materiales" ADD "id_categoria" integer`);
        await queryRunner.query(`ALTER TABLE "materiales" ADD "notas" text`);
        await queryRunner.query(`ALTER TABLE "materiales" ADD CONSTRAINT "FK_materiales_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "materiales" DROP CONSTRAINT "FK_materiales_categoria"`);
        await queryRunner.query(`ALTER TABLE "materiales" DROP COLUMN "notas"`);
        await queryRunner.query(`ALTER TABLE "materiales" DROP COLUMN "id_categoria"`);
    }

}
