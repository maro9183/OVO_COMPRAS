import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProveedoresYMateriales1746660000000 implements MigrationInterface {
  name = 'ProveedoresYMateriales1746660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensiones
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // 2. Tabla Proveedores
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id               SERIAL       PRIMARY KEY,
        codigo           VARCHAR(20)  NOT NULL UNIQUE,
        razon_social     VARCHAR(250) NOT NULL,
        nombre_fantasia  VARCHAR(200),
        cuit             VARCHAR(13)  UNIQUE,
        direccion        TEXT,
        telefono         VARCHAR(50),
        email            VARCHAR(200),
        contacto_nombre  VARCHAR(150),
        contacto_telefono VARCHAR(50),
        contacto_email   VARCHAR(200),
        sitio_web        VARCHAR(300),
        notas            TEXT,
        activo           BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tablas Contador
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS material_contador (
        id          SERIAL  PRIMARY KEY,
        prefijo     VARCHAR(10) NOT NULL DEFAULT 'MAT',
        secuencial  INTEGER NOT NULL,
        UNIQUE(prefijo, secuencial)
      );

      CREATE TABLE IF NOT EXISTS proveedor_contador (
        id          SERIAL  PRIMARY KEY,
        prefijo     VARCHAR(10) NOT NULL DEFAULT 'PROV',
        secuencial  INTEGER NOT NULL,
        UNIQUE(prefijo, secuencial)
      );
    `);

    // 4. Funciones Generación de Código
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generar_codigo_material() RETURNS VARCHAR AS $$
      DECLARE
        sec INTEGER;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext('material_codigo'));
        SELECT COALESCE(MAX(secuencial), 0) + 1 INTO sec
          FROM material_contador
         WHERE prefijo = 'MAT';
        INSERT INTO material_contador (prefijo, secuencial) VALUES ('MAT', sec);
        RETURN format('MAT-%s', lpad(sec::text, 5, '0'));
      END;
      $$ LANGUAGE plpgsql VOLATILE;

      CREATE OR REPLACE FUNCTION generar_codigo_proveedor() RETURNS VARCHAR AS $$
      DECLARE
        sec INTEGER;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext('proveedor_codigo'));
        SELECT COALESCE(MAX(secuencial), 0) + 1 INTO sec
          FROM proveedor_contador
         WHERE prefijo = 'PROV';
        INSERT INTO proveedor_contador (prefijo, secuencial) VALUES ('PROV', sec);
        RETURN format('PROV-%s', lpad(sec::text, 5, '0'));
      END;
      $$ LANGUAGE plpgsql VOLATILE;
    `);

    // 5. Evolución Materiales
    await queryRunner.query(`
      ALTER TABLE materiales 
        ADD COLUMN IF NOT EXISTS codigo_proveedor VARCHAR(100),
        ADD COLUMN IF NOT EXISTS id_proveedor_principal INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS keywords TEXT[];
    `);

    // 6. Índices Unicidad CI
    // Usamos DROP INDEX IF EXISTS seguido de CREATE para asegurar idempotencia y evitar fallos si ya existen índices parecidos
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_materiales_nombre_ci;
      CREATE UNIQUE INDEX idx_materiales_nombre_ci ON materiales (LOWER(nombre));

      DROP INDEX IF EXISTS idx_proveedores_razon_social_ci;
      CREATE UNIQUE INDEX idx_proveedores_razon_social_ci ON proveedores (LOWER(razon_social));
    `);

    // 7. Índices GIN (Búsqueda)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_materiales_nombre_trgm;
      CREATE INDEX idx_materiales_nombre_trgm ON materiales USING gin (nombre gin_trgm_ops);

      DROP INDEX IF EXISTS idx_materiales_keywords;
      CREATE INDEX idx_materiales_keywords ON materiales USING gin (keywords);

      CREATE INDEX IF NOT EXISTS idx_materiales_codigo_prov ON materiales (codigo_proveedor) WHERE codigo_proveedor IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_materiales_proveedor ON materiales (id_proveedor_principal) WHERE id_proveedor_principal IS NOT NULL;
    `);

    // 8. Triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_proveedores_upd ON proveedores;
      CREATE TRIGGER trg_proveedores_upd
        BEFORE UPDATE ON proveedores
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
    `);

    // 9. Actualizar Vistas BI (Reflect Materiales changes)
    await queryRunner.query(`DROP VIEW IF EXISTS vw_detalles_bi CASCADE;`);
    await queryRunner.query(`
      CREATE VIEW vw_detalles_bi AS
      SELECT
        d.id                     AS detalle_id,
        d.id_pedido,
        p.numero_solicitud,
        COALESCE(m.nombre, d.descripcion_manual) AS item_descripcion,
        m.codigo                 AS material_codigo,
        m.codigo_proveedor       AS material_codigo_proveedor,
        prov.razon_social        AS proveedor_principal,
        d.descripcion_manual IS NOT NULL          AS es_manual,
        d.cantidad,
        COALESCE(uo.simbolo, mu.simbolo)          AS unidad,
        d.id_estado              AS estado_detalle,
        d.observaciones,
        d.fecha_modif,
        d.activo,
        COALESCE(uc.nombre, d.comprador_nombre_snapshot) AS comprador_nombre
      FROM detalle_pedido d
        JOIN pedidos p    ON p.id  = d.id_pedido
        LEFT JOIN materiales m  ON m.id  = d.id_material
        LEFT JOIN unidades   mu ON mu.id = m.id_unidad
        LEFT JOIN unidades   uo ON uo.id = d.id_unidad_override
        LEFT JOIN usuarios   uc ON uc.id = d.id_comprador
        LEFT JOIN proveedores prov ON prov.id = m.id_proveedor_principal;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_detalles_bi CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS proveedores CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS material_contador CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS proveedor_contador CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS generar_codigo_material CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS generar_codigo_proveedor CASCADE;`);
    
    await queryRunner.query(`
      ALTER TABLE materiales 
        DROP COLUMN IF EXISTS codigo_proveedor,
        DROP COLUMN IF EXISTS id_proveedor_principal,
        DROP COLUMN IF EXISTS keywords;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_materiales_nombre_ci;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_materiales_nombre_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_materiales_keywords;`);
  }
}
