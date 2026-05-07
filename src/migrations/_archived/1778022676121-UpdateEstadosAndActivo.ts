import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEstadosAndActivo1778022676121 implements MigrationInterface {
    name = 'UpdateEstadosAndActivo1778022676121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop views that depend on the ENUMs
        await queryRunner.query(`DROP VIEW IF EXISTS "vw_historial_bi"`);
        await queryRunner.query(`DROP VIEW IF EXISTS "vw_detalles_bi"`);
        await queryRunner.query(`DROP VIEW IF EXISTS "vw_pedidos_bi"`);

        // Drop indices that depend on the ENUMs
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_detalle_estado"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_detalle_pedido_estado"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_detalle_comprador_estado"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_pedidos_estado"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_pedidos_estado_fecha"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_pedidos_solicitante_estado"`);

        // Add activo column to pedidos and detalle_pedido
        await queryRunner.query(`ALTER TABLE "detalle_pedido" ADD "activo" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "pedidos" ADD "activo" boolean NOT NULL DEFAULT true`);

        // Rename and update ENUMs
        await queryRunner.query(`ALTER TYPE "public"."estado_detalle" RENAME TO "estado_detalle_old"`);
        await queryRunner.query(`CREATE TYPE "public"."estado_detalle_new" AS ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_COMPRA', 'COMPRADO', 'RECIBIDO')`);
        await queryRunner.query(`ALTER TABLE "detalle_pedido" ALTER COLUMN "id_estado" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "detalle_pedido" ALTER COLUMN "id_estado" TYPE "public"."estado_detalle_new" USING "id_estado"::"text"::"public"."estado_detalle_new"`);
        await queryRunner.query(`ALTER TABLE "detalle_pedido" ALTER COLUMN "id_estado" SET DEFAULT 'PENDIENTE'`);
        await queryRunner.query(`DROP TYPE "public"."estado_detalle_old"`);
        await queryRunner.query(`ALTER TYPE "public"."estado_detalle_new" RENAME TO "estado_detalle"`);

        await queryRunner.query(`ALTER TYPE "public"."estado_pedido" RENAME TO "estado_pedido_old"`);
        await queryRunner.query(`CREATE TYPE "public"."estado_pedido_new" AS ENUM('CREADO', 'APROBADO', 'APROBADO_PARCIAL', 'RECHAZADO', 'EN_COMPRA', 'COMPRADO', 'RECIBIDO')`);
        await queryRunner.query(`ALTER TABLE "pedidos" ALTER COLUMN "id_estado" DROP DEFAULT`);
        
        // Map PENDIENTE to CREADO for existing records
        await queryRunner.query(`ALTER TABLE "pedidos" ALTER COLUMN "id_estado" TYPE "public"."estado_pedido_new" USING (CASE WHEN "id_estado"::text = 'PENDIENTE' THEN 'CREADO' ELSE "id_estado"::text END)::"public"."estado_pedido_new"`);
        
        await queryRunner.query(`ALTER TABLE "pedidos" ALTER COLUMN "id_estado" SET DEFAULT 'CREADO'`);
        await queryRunner.query(`DROP TYPE "public"."estado_pedido_old"`);
        await queryRunner.query(`ALTER TYPE "public"."estado_pedido_new" RENAME TO "estado_pedido"`);

        // Recreate indices
        await queryRunner.query(`CREATE INDEX "idx_pedidos_solicitante_estado" ON "pedidos" ("id_solicitante", "id_estado") `);
        await queryRunner.query(`CREATE INDEX "idx_pedidos_estado_fecha" ON "pedidos" ("id_estado", "fecha_pedido") `);
        await queryRunner.query(`CREATE INDEX "idx_pedidos_estado" ON "pedidos" ("id_estado") `);
        await queryRunner.query(`CREATE INDEX "idx_detalle_comprador_estado" ON "detalle_pedido" ("id_comprador", "id_estado") WHERE (id_estado = ANY (ARRAY['PENDIENTE'::estado_detalle, 'EN_COMPRA'::estado_detalle]))`);
        await queryRunner.query(`CREATE INDEX "idx_detalle_pedido_estado" ON "detalle_pedido" ("id_pedido", "id_estado") `);
        await queryRunner.query(`CREATE INDEX "idx_detalle_estado" ON "detalle_pedido" ("id_estado") `);

        // Recreate views
        await queryRunner.query(`
          CREATE VIEW "vw_pedidos_bi" AS
          SELECT p.id AS pedido_id,
            p.numero_solicitud,
            p.descripcion,
            p.id_estado AS estado_pedido,
            p.observaciones,
            p.fecha_pedido,
            p.fecha_modif,
            u.nombre AS solicitante_nombre,
            u.rol AS solicitante_rol,
            s.nombre AS sector_nombre
          FROM ((pedidos p
            JOIN usuarios u ON ((u.id = p.id_solicitante)))
            LEFT JOIN sectores s ON ((s.id = u.id_sector)));
        `);

        await queryRunner.query(`
          CREATE VIEW "vw_detalles_bi" AS
          SELECT d.id AS detalle_id,
            d.id_pedido,
            p.numero_solicitud,
            COALESCE(m.nombre, (d.descripcion_manual)::character varying) AS item_descripcion,
            m.codigo AS material_codigo,
            (d.descripcion_manual IS NOT NULL) AS es_manual,
            d.cantidad,
            COALESCE(uo.simbolo, mu.simbolo) AS unidad,
            d.id_estado AS estado_detalle,
            d.observaciones,
            d.fecha_modif,
            COALESCE(uc.nombre, d.comprador_nombre_snapshot) AS comprador_nombre
          FROM (((((detalle_pedido d
            JOIN pedidos p ON ((p.id = d.id_pedido)))
            LEFT JOIN materiales m ON ((m.id = d.id_material)))
            LEFT JOIN unidades mu ON ((mu.id = m.id_unidad)))
            LEFT JOIN unidades uo ON ((uo.id = d.id_unidad_override)))
            LEFT JOIN usuarios uc ON ((uc.id = d.id_comprador)));
        `);

        await queryRunner.query(`
          CREATE VIEW "vw_historial_bi" AS
          SELECT h.id,
            h.tipo_entidad,
            h.id_referencia,
            h.estado_anterior,
            h.estado_nuevo,
            h.fecha,
            u.nombre AS usuario_nombre,
            u.rol AS usuario_rol
          FROM (historial_estados h
            LEFT JOIN usuarios u ON ((u.id = h.id_usuario)));
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pedidos" DROP COLUMN "activo"`);
        await queryRunner.query(`ALTER TABLE "detalle_pedido" DROP COLUMN "activo"`);
        
        // (Enums can be optionally reverted, but for simplicity we keep them or revert to old)
    }
}
