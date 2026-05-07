import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateMateriales1714851000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "materiales",
            columns: [
                {
                    name: "id",
                    type: "serial",
                    isPrimary: true
                },
                {
                    name: "codigo",
                    type: "varchar",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "nombre",
                    type: "varchar",
                    isNullable: false
                },
                {
                    name: "link_plano",
                    type: "varchar",
                    isNullable: true
                },
                {
                    name: "descripcion",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "notas",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "now()"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "now()"
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("materiales");
    }
}
