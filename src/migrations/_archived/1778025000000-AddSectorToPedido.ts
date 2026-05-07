import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSectorToPedido1778025000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pedidos" ADD COLUMN "id_sector" integer`);
        await queryRunner.query(`ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_id_sector_fkey" FOREIGN KEY ("id_sector") REFERENCES "sectores"("id") ON DELETE SET NULL`);
        
        // Populate existing orders with their solicitor's sector
        await queryRunner.query(`
            UPDATE pedidos p
            SET id_sector = u.id_sector
            FROM usuarios u
            WHERE p.id_solicitante = u.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_id_sector_fkey"`);
        await queryRunner.query(`ALTER TABLE "pedidos" DROP COLUMN "id_sector"`);
    }
}
