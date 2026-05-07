import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBuyerCategories1778026000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "usuario_categorias" (
                "id_usuario" integer NOT NULL, 
                "id_categoria" integer NOT NULL, 
                CONSTRAINT "PK_usuario_categorias" PRIMARY KEY ("id_usuario", "id_categoria"),
                CONSTRAINT "FK_usuario_categorias_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_usuario_categorias_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_usuario_categorias_usuario" ON "usuario_categorias" ("id_usuario")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_usuario_categorias_categoria" ON "usuario_categorias" ("id_categoria")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "usuario_categorias"`);
    }
}
