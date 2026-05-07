import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorFinal1715000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MIGRACION DESTRUCTIVA: No permitida en entorno production');
    }

    await queryRunner.query(`
      DROP TABLE IF EXISTS historial_estados CASCADE;
      DROP TABLE IF EXISTS detalle_pedido CASCADE;
      DROP TABLE IF EXISTS pedidos CASCADE;
      DROP TABLE IF EXISTS materiales CASCADE;
      DROP TABLE IF EXISTS solicitud_contador CASCADE;
      DROP TABLE IF EXISTS evento_outbox CASCADE;
      DROP TABLE IF EXISTS unidades CASCADE;
      DROP TABLE IF EXISTS usuarios CASCADE;
      DROP TABLE IF EXISTS sectores CASCADE;

      DROP TYPE IF EXISTS usuario_rol CASCADE;
      DROP TYPE IF EXISTS estado_pedido CASCADE;
      DROP TYPE IF EXISTS estado_detalle CASCADE;
      DROP TYPE IF EXISTS entidad_historial CASCADE;

      DROP FUNCTION IF EXISTS generar_numero_solicitud CASCADE;
      DROP FUNCTION IF EXISTS actualizar_timestamp CASCADE;
      DROP FUNCTION IF EXISTS actualizar_fecha_modif CASCADE;

      CREATE TYPE usuario_rol AS ENUM ('SOLICITANTE', 'ENCARGADO', 'COMPRADOR');
      CREATE TYPE estado_pedido AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
      CREATE TYPE estado_detalle AS ENUM ('PENDIENTE', 'EN_COMPRA', 'COMPRADO');
      CREATE TYPE entidad_historial AS ENUM ('PEDIDO', 'DETALLE');

      CREATE TABLE sectores (
          id       SERIAL PRIMARY KEY,
          nombre   VARCHAR(100) NOT NULL UNIQUE,
          activo   BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE unidades (
          id          SERIAL PRIMARY KEY,
          simbolo     VARCHAR(20)  NOT NULL UNIQUE,  
          descripcion VARCHAR(100) NOT NULL           
      );

      CREATE TABLE usuarios (
          id              SERIAL PRIMARY KEY,
          nombre          VARCHAR(150) NOT NULL,
          id_sector       INTEGER REFERENCES sectores(id) ON DELETE RESTRICT,
          correo          VARCHAR(150) UNIQUE,
          telefono        VARCHAR(30),
          rol             usuario_rol NOT NULL,
          puede_loguearse BOOLEAN NOT NULL DEFAULT FALSE,
          username        VARCHAR(100) UNIQUE,
          password_hash   VARCHAR(120),
          activo          BOOLEAN NOT NULL DEFAULT TRUE,
          created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT chk_login_completo CHECK (
              (puede_loguearse = FALSE AND username IS NULL AND password_hash IS NULL) OR
              (puede_loguearse = TRUE  AND username IS NOT NULL AND password_hash IS NOT NULL)
          ),
          CONSTRAINT chk_password_hash_format CHECK (
              password_hash IS NULL OR
              password_hash LIKE '$2b$%' OR   
              password_hash LIKE '$argon2%'   
          )
      );

      CREATE TABLE materiales (
          id          SERIAL PRIMARY KEY,
          codigo      VARCHAR(50)  NOT NULL UNIQUE,
          nombre      VARCHAR(200) NOT NULL,
          descripcion TEXT,
          id_unidad   INTEGER REFERENCES unidades(id) ON DELETE RESTRICT,
          link_plano  VARCHAR(500),
          activo      BOOLEAN NOT NULL DEFAULT TRUE,
          created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE solicitud_contador (
          id          SERIAL PRIMARY KEY,
          anio        INTEGER NOT NULL,
          secuencial  INTEGER NOT NULL,
          UNIQUE(anio, secuencial)
      );

      CREATE TABLE pedidos (
          id               SERIAL PRIMARY KEY,
          numero_solicitud VARCHAR(30) NOT NULL UNIQUE,
          idempotency_key  UUID UNIQUE,
          descripcion      VARCHAR(500) NOT NULL,
          id_solicitante   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
          id_estado        estado_pedido NOT NULL DEFAULT 'PENDIENTE',
          observaciones    TEXT,
          fecha_pedido     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          fecha_modif      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_pedidos_estado       ON pedidos (id_estado);
      CREATE INDEX idx_pedidos_solicitante  ON pedidos (id_solicitante);
      CREATE INDEX idx_pedidos_estado_fecha ON pedidos (id_estado, fecha_pedido DESC);
      CREATE INDEX idx_pedidos_solicitante_estado ON pedidos (id_solicitante, id_estado);
      CREATE INDEX idx_pedidos_anio_solicitud ON pedidos (SUBSTRING(numero_solicitud FROM 5 FOR 4));

      CREATE TABLE detalle_pedido (
          id                        SERIAL PRIMARY KEY,
          id_pedido                 INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          id_material               INTEGER REFERENCES materiales(id) ON DELETE RESTRICT,
          descripcion_manual        TEXT,
          cantidad                  NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
          id_unidad_override        INTEGER REFERENCES unidades(id) ON DELETE RESTRICT,
          id_comprador              INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          comprador_nombre_snapshot VARCHAR(150),
          id_estado                 estado_detalle NOT NULL DEFAULT 'PENDIENTE',
          observaciones             TEXT,
          fecha_modif               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT chk_material_o_manual CHECK (
              (id_material IS NOT NULL AND descripcion_manual IS NULL) OR
              (id_material IS NULL AND descripcion_manual IS NOT NULL AND TRIM(descripcion_manual) <> '')
          )
      );

      CREATE INDEX idx_detalle_pedido ON detalle_pedido (id_pedido);
      CREATE INDEX idx_detalle_comprador ON detalle_pedido (id_comprador);
      CREATE INDEX idx_detalle_estado ON detalle_pedido (id_estado);
      CREATE INDEX idx_detalle_pedido_estado ON detalle_pedido (id_pedido, id_estado);
      CREATE INDEX idx_detalle_comprador_estado ON detalle_pedido (id_comprador, id_estado) WHERE id_estado IN ('PENDIENTE', 'EN_COMPRA');

      CREATE TABLE historial_estados (
          id              SERIAL PRIMARY KEY,
          tipo_entidad    entidad_historial NOT NULL,
          id_referencia   INTEGER NOT NULL,
          estado_anterior VARCHAR(30),
          estado_nuevo    VARCHAR(30) NOT NULL,
          id_usuario      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          fecha           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_historial_fecha ON historial_estados (fecha DESC);
      CREATE INDEX idx_historial_entidad_ref ON historial_estados (tipo_entidad, id_referencia, fecha DESC);
      CREATE INDEX idx_historial_usuario_fecha ON historial_estados (id_usuario, fecha DESC);

      CREATE TABLE evento_outbox (
          id           SERIAL PRIMARY KEY,
          aggregate_id VARCHAR NOT NULL,
          type         VARCHAR NOT NULL,
          payload      JSONB NOT NULL,
          processed    BOOLEAN NOT NULL DEFAULT FALSE,
          created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMPTZ
      );
      CREATE INDEX idx_outbox_unprocessed ON evento_outbox (processed, created_at) WHERE NOT processed;

      CREATE OR REPLACE FUNCTION actualizar_timestamp() RETURNS trigger AS $$
      BEGIN
          NEW.updated_at := CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_usuarios_upd   BEFORE UPDATE ON usuarios   FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      CREATE TRIGGER trg_materiales_upd BEFORE UPDATE ON materiales FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

      CREATE OR REPLACE FUNCTION actualizar_fecha_modif() RETURNS trigger AS $$
      BEGIN
          NEW.fecha_modif := CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_pedidos_upd  BEFORE UPDATE ON pedidos        FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modif();
      CREATE TRIGGER trg_detalle_upd  BEFORE UPDATE ON detalle_pedido FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modif();

      CREATE OR REPLACE FUNCTION generar_numero_solicitud() RETURNS VARCHAR AS $$
      DECLARE
          anio_actual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
          sec         INTEGER;
      BEGIN
          PERFORM pg_advisory_xact_lock(anio_actual);
          SELECT COALESCE(MAX(secuencial), 0) + 1 INTO sec FROM solicitud_contador WHERE anio = anio_actual;
          INSERT INTO solicitud_contador (anio, secuencial) VALUES (anio_actual, sec);
          RETURN format('SOL-%s-%s', anio_actual, lpad(sec::text, 6, '0'));
      END;
      $$ LANGUAGE plpgsql VOLATILE;

      CREATE OR REPLACE VIEW vw_pedidos_bi AS
      SELECT p.id AS pedido_id, p.numero_solicitud, p.descripcion, p.id_estado AS estado_pedido, p.observaciones, p.fecha_pedido, p.fecha_modif, u.nombre AS solicitante_nombre, u.rol AS solicitante_rol, s.nombre AS sector_nombre
      FROM pedidos p JOIN usuarios u ON u.id = p.id_solicitante LEFT JOIN sectores s ON s.id = u.id_sector;

      CREATE OR REPLACE VIEW vw_detalles_bi AS
      SELECT d.id AS detalle_id, d.id_pedido, p.numero_solicitud, COALESCE(m.nombre, d.descripcion_manual) AS item_descripcion, m.codigo AS material_codigo, d.descripcion_manual IS NOT NULL AS es_manual, d.cantidad, COALESCE(uo.simbolo, mu.simbolo) AS unidad, d.id_estado AS estado_detalle, d.observaciones, d.fecha_modif, COALESCE(uc.nombre, d.comprador_nombre_snapshot) AS comprador_nombre
      FROM detalle_pedido d JOIN pedidos p ON p.id = d.id_pedido LEFT JOIN materiales m ON m.id = d.id_material LEFT JOIN unidades mu ON mu.id = m.id_unidad LEFT JOIN unidades uo ON uo.id = d.id_unidad_override LEFT JOIN usuarios uc ON uc.id = d.id_comprador;

      CREATE OR REPLACE VIEW vw_historial_bi AS
      SELECT h.id, h.tipo_entidad, h.id_referencia, h.estado_anterior, h.estado_nuevo, h.fecha, u.nombre AS usuario_nombre, u.rol AS usuario_rol
      FROM historial_estados h LEFT JOIN usuarios u ON u.id = h.id_usuario;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration is completely destructive on UP. Not implementing DOWN since we have no data to restore.
  }
}
