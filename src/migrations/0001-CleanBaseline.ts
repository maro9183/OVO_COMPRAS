import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ============================================================================
 *  0001-CleanBaseline
 * ============================================================================
 *
 *  Migración base consolidada que representa el estado FINAL del schema.
 *
 *  Reemplaza las 12 migraciones históricas (1680000000000 → 1778029000000)
 *  que incluían estructuras obsoletas, refactors destructivos y tablas zombie.
 *
 *  Secciones:
 *    §1  Limpieza de estructuras zombie
 *    §2  Tipos ENUM
 *    §3  Tablas del dominio (en orden de dependencia)
 *    §4  Índices
 *    §5  Funciones PL/pgSQL
 *    §6  Triggers
 *    §7  Vistas BI (capa analítica opcional)
 *
 *  Compatibilidad:
 *    - Base nueva (Docker/onboarding): ejecutar directamente.
 *    - Base existente (producción): registrar como ejecutada manualmente
 *      INSERT INTO migrations(timestamp, name) VALUES (1, 'CleanBaseline0001');
 *
 * ============================================================================
 */
export class CleanBaseline1746633000000 implements MigrationInterface {
  name = 'CleanBaseline1746633000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // §1 — LIMPIEZA DE ESTRUCTURAS ZOMBIE
    //
    // Tablas y tipos creados en iteraciones anteriores que ya no forman parte
    // del modelo vigente. DROP IF EXISTS para idempotencia.
    // =========================================================================
    // — 1a. Vistas (siempre seguro con IF EXISTS)
    await queryRunner.query(`
      DROP VIEW  IF EXISTS vw_historial_bi CASCADE;
      DROP VIEW  IF EXISTS vw_detalles_bi  CASCADE;
      DROP VIEW  IF EXISTS vw_pedidos_bi   CASCADE;
    `);

    // — 1b. Tablas zombie de InitialSchema (nunca droppeadas por RefactorFinal)
    await queryRunner.query(`
      DROP TABLE IF EXISTS pedido_historial    CASCADE;
      DROP TABLE IF EXISTS pedido_items        CASCADE;
      DROP TABLE IF EXISTS categoria_comprador CASCADE;
      DROP TABLE IF EXISTS usuarios_roles      CASCADE;
      DROP TABLE IF EXISTS roles               CASCADE;
    `);

    // — 1c. Columnas y constraints zombie en categorias
    //   Encapsulado en DO block para evitar fallo si la tabla no existe
    //   (caso: bootstrap limpio donde categorias aún no fue creada)
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'categorias'
        ) THEN
          ALTER TABLE categorias DROP COLUMN IF EXISTS created_at;
          ALTER TABLE categorias DROP COLUMN IF EXISTS updated_at;
          ALTER TABLE categorias DROP COLUMN IF EXISTS sector_id;
          ALTER TABLE categorias DROP COLUMN IF EXISTS id_sector;
          ALTER TABLE categorias DROP CONSTRAINT IF EXISTS "categorias_sector_id_nombre_key";
        END IF;
      END $$;
    `);

    // — 1d. ENUMs obsoletos de InitialSchema V1
    await queryRunner.query(`DROP TYPE IF EXISTS pedido_estado CASCADE`);

    // — 1e. Funciones obsoletas (se recrean limpias en §5)
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS actualizar_timestamp  CASCADE;
      DROP FUNCTION IF EXISTS actualizar_fecha_modif CASCADE;
      DROP FUNCTION IF EXISTS generar_numero_solicitud CASCADE;
    `);

    // =========================================================================
    // §2 — TIPOS ENUM
    // =========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usuario_rol') THEN
          CREATE TYPE usuario_rol AS ENUM (
            'SOLICITANTE', 'ENCARGADO', 'COMPRADOR', 'ADMIN'
          );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pedido') THEN
          CREATE TYPE estado_pedido AS ENUM (
            'CREADO', 'APROBADO', 'APROBADO_PARCIAL', 'RECHAZADO',
            'EN_COMPRA', 'COMPRADO', 'RECIBIDO'
          );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_detalle') THEN
          CREATE TYPE estado_detalle AS ENUM (
            'PENDIENTE', 'APROBADO', 'RECHAZADO',
            'EN_COMPRA', 'COMPRADO', 'RECIBIDO'
          );
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entidad_historial') THEN
          CREATE TYPE entidad_historial AS ENUM ('PEDIDO', 'DETALLE');
        END IF;
      END $$;
    `);

    // =========================================================================
    // §3 — TABLAS DEL DOMINIO (orden de dependencia)
    // =========================================================================

    // 3.1 — Catálogos base (sin dependencias)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sectores (
        id       SERIAL       PRIMARY KEY,
        nombre   VARCHAR(100) NOT NULL UNIQUE,
        activo   BOOLEAN      NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id       SERIAL       PRIMARY KEY,
        nombre   VARCHAR(150) NOT NULL,
        activo   BOOLEAN      NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS unidades (
        id          SERIAL       PRIMARY KEY,
        simbolo     VARCHAR(20)  NOT NULL UNIQUE,
        descripcion VARCHAR(100) NOT NULL,
        activo      BOOLEAN      NOT NULL DEFAULT TRUE
      );
    `);

    // 3.2 — Usuarios (depende de: sectores)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id              SERIAL       PRIMARY KEY,
        nombre          VARCHAR(150) NOT NULL,
        id_sector       INTEGER      REFERENCES sectores(id) ON DELETE RESTRICT,
        correo          VARCHAR(150) UNIQUE,
        telefono        VARCHAR(30),
        rol             usuario_rol  NOT NULL,
        puede_loguearse BOOLEAN      NOT NULL DEFAULT FALSE,
        username        VARCHAR(100) UNIQUE,
        password_hash   VARCHAR(120),
        activo          BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

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
    `);

    // 3.3 — Join table: usuario ↔ categorias (depende de: usuarios, categorias)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuario_categorias (
        id_usuario   INTEGER NOT NULL,
        id_categoria INTEGER NOT NULL,
        CONSTRAINT pk_usuario_categorias PRIMARY KEY (id_usuario, id_categoria),
        CONSTRAINT fk_uc_usuario   FOREIGN KEY (id_usuario)   REFERENCES usuarios(id)   ON DELETE CASCADE,
        CONSTRAINT fk_uc_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE CASCADE
      );
    `);

    // 3.4 — Materiales (depende de: unidades, categorias)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS materiales (
        id           SERIAL       PRIMARY KEY,
        codigo       VARCHAR(50)  NOT NULL UNIQUE,
        nombre       VARCHAR(200) NOT NULL,
        descripcion  TEXT,
        id_unidad    INTEGER      REFERENCES unidades(id)    ON DELETE RESTRICT,
        id_categoria INTEGER      REFERENCES categorias(id)  ON DELETE NO ACTION,
        link_plano   VARCHAR(500),
        notas        TEXT,
        activo       BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3.5 — Contador de solicitudes (auxiliar para PL/pgSQL, sin entity)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS solicitud_contador (
        id          SERIAL  PRIMARY KEY,
        anio        INTEGER NOT NULL,
        secuencial  INTEGER NOT NULL,
        UNIQUE(anio, secuencial)
      );
    `);

    // 3.6 — Pedidos (depende de: usuarios, sectores)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id               SERIAL        PRIMARY KEY,
        numero_solicitud VARCHAR(30)   NOT NULL UNIQUE,
        idempotency_key  UUID          UNIQUE,
        descripcion      VARCHAR(500)  NOT NULL,
        id_solicitante   INTEGER       NOT NULL REFERENCES usuarios(id)  ON DELETE RESTRICT,
        id_sector        INTEGER       REFERENCES sectores(id) ON DELETE SET NULL,
        id_estado        estado_pedido NOT NULL DEFAULT 'CREADO',
        observaciones    TEXT,
        fecha_pedido     TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
        fecha_modif      TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
        activo           BOOLEAN       NOT NULL DEFAULT TRUE
      );
    `);

    // 3.7 — Detalle de pedidos (depende de: pedidos, materiales, unidades, usuarios)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS detalle_pedido (
        id                        SERIAL         PRIMARY KEY,
        id_pedido                 INTEGER        NOT NULL REFERENCES pedidos(id)     ON DELETE CASCADE,
        id_material               INTEGER        REFERENCES materiales(id)           ON DELETE RESTRICT,
        descripcion_manual        TEXT,
        cantidad                  NUMERIC(10,3)  NOT NULL CHECK (cantidad > 0),
        id_unidad_override        INTEGER        REFERENCES unidades(id)             ON DELETE RESTRICT,
        id_comprador              INTEGER        REFERENCES usuarios(id)             ON DELETE SET NULL,
        comprador_nombre_snapshot VARCHAR(150),
        id_estado                 estado_detalle NOT NULL DEFAULT 'PENDIENTE',
        observaciones             TEXT,
        fecha_modif               TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP,
        activo                    BOOLEAN        NOT NULL DEFAULT TRUE,

        CONSTRAINT chk_material_o_manual CHECK (
          (id_material IS NOT NULL AND descripcion_manual IS NULL) OR
          (id_material IS NULL AND descripcion_manual IS NOT NULL AND TRIM(descripcion_manual) <> '')
        )
      );
    `);

    // 3.8 — Historial de estados (depende de: usuarios)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS historial_estados (
        id              SERIAL            PRIMARY KEY,
        tipo_entidad    entidad_historial NOT NULL,
        id_referencia   INTEGER           NOT NULL,
        estado_anterior VARCHAR(30),
        estado_nuevo    VARCHAR(30)       NOT NULL,
        id_usuario      INTEGER           REFERENCES usuarios(id) ON DELETE SET NULL,
        fecha           TIMESTAMPTZ       DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3.9 — Outbox de eventos (aislada — integración futura con n8n/IA)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS evento_outbox (
        id           SERIAL       PRIMARY KEY,
        aggregate_id VARCHAR(100) NOT NULL,
        type         VARCHAR(100) NOT NULL,
        payload      JSONB        NOT NULL,
        processed    BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMPTZ
      );
    `);

    // =========================================================================
    // §4 — ÍNDICES
    // =========================================================================
    await queryRunner.query(`
      -- usuario_categorias
      CREATE INDEX IF NOT EXISTS idx_uc_usuario   ON usuario_categorias (id_usuario);
      CREATE INDEX IF NOT EXISTS idx_uc_categoria ON usuario_categorias (id_categoria);

      -- pedidos
      CREATE INDEX IF NOT EXISTS idx_pedidos_estado            ON pedidos (id_estado);
      CREATE INDEX IF NOT EXISTS idx_pedidos_solicitante       ON pedidos (id_solicitante);
      CREATE INDEX IF NOT EXISTS idx_pedidos_estado_fecha      ON pedidos (id_estado, fecha_pedido DESC);
      CREATE INDEX IF NOT EXISTS idx_pedidos_solicitante_estado ON pedidos (id_solicitante, id_estado);
      CREATE INDEX IF NOT EXISTS idx_pedidos_anio_solicitud    ON pedidos (SUBSTRING(numero_solicitud FROM 5 FOR 4));

      -- detalle_pedido
      CREATE INDEX IF NOT EXISTS idx_detalle_pedido           ON detalle_pedido (id_pedido);
      CREATE INDEX IF NOT EXISTS idx_detalle_comprador        ON detalle_pedido (id_comprador);
      CREATE INDEX IF NOT EXISTS idx_detalle_estado           ON detalle_pedido (id_estado);
      CREATE INDEX IF NOT EXISTS idx_detalle_pedido_estado    ON detalle_pedido (id_pedido, id_estado);

      -- historial_estados
      CREATE INDEX IF NOT EXISTS idx_historial_fecha          ON historial_estados (fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_historial_entidad_ref    ON historial_estados (tipo_entidad, id_referencia, fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_historial_usuario_fecha  ON historial_estados (id_usuario, fecha DESC);

      -- evento_outbox
      CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed       ON evento_outbox (processed, created_at) WHERE NOT processed;
    `);

    // Índice parcial que requiere CREATE separado (no soporta IF NOT EXISTS con WHERE en algunos PG)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_detalle_comprador_estado;
      CREATE INDEX idx_detalle_comprador_estado
        ON detalle_pedido (id_comprador, id_estado)
        WHERE id_estado IN ('PENDIENTE', 'EN_COMPRA');
    `);

    // =========================================================================
    // §5 — FUNCIONES PL/pgSQL
    // =========================================================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION actualizar_timestamp() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION actualizar_fecha_modif() RETURNS trigger AS $$
      BEGIN
        NEW.fecha_modif := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION generar_numero_solicitud() RETURNS VARCHAR AS $$
      DECLARE
        anio_actual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
        sec         INTEGER;
      BEGIN
        PERFORM pg_advisory_xact_lock(anio_actual);
        SELECT COALESCE(MAX(secuencial), 0) + 1 INTO sec
          FROM solicitud_contador
         WHERE anio = anio_actual;
        INSERT INTO solicitud_contador (anio, secuencial) VALUES (anio_actual, sec);
        RETURN format('SOL-%s-%s', anio_actual, lpad(sec::text, 6, '0'));
      END;
      $$ LANGUAGE plpgsql VOLATILE;
    `);

    // =========================================================================
    // §6 — TRIGGERS
    // =========================================================================
    await queryRunner.query(`
      -- Drop existing triggers to avoid duplicates
      DROP TRIGGER IF EXISTS trg_usuarios_upd   ON usuarios;
      DROP TRIGGER IF EXISTS trg_materiales_upd ON materiales;
      DROP TRIGGER IF EXISTS trg_pedidos_upd    ON pedidos;
      DROP TRIGGER IF EXISTS trg_detalle_upd    ON detalle_pedido;

      CREATE TRIGGER trg_usuarios_upd
        BEFORE UPDATE ON usuarios
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

      CREATE TRIGGER trg_materiales_upd
        BEFORE UPDATE ON materiales
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

      CREATE TRIGGER trg_pedidos_upd
        BEFORE UPDATE ON pedidos
        FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modif();

      CREATE TRIGGER trg_detalle_upd
        BEFORE UPDATE ON detalle_pedido
        FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modif();
    `);

    // =========================================================================
    // §7 — VISTAS BI (capa analítica opcional)
    //
    // Estas vistas desnormalizadas están pensadas para conectar herramientas
    // de reporting externas (Metabase, Grafana, etc.).
    // No son consumidas por el código TypeScript de la aplicación.
    // Si no se usan, pueden eliminarse sin impacto funcional.
    // =========================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_pedidos_bi AS
      SELECT
        p.id                     AS pedido_id,
        p.numero_solicitud,
        p.descripcion,
        p.id_estado              AS estado_pedido,
        p.observaciones,
        p.fecha_pedido,
        p.fecha_modif,
        p.activo,
        u.nombre                 AS solicitante_nombre,
        u.rol                    AS solicitante_rol,
        s.nombre                 AS sector_nombre
      FROM pedidos p
        JOIN  usuarios u ON u.id = p.id_solicitante
        LEFT JOIN sectores s ON s.id = p.id_sector;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_detalles_bi AS
      SELECT
        d.id                     AS detalle_id,
        d.id_pedido,
        p.numero_solicitud,
        COALESCE(m.nombre, d.descripcion_manual) AS item_descripcion,
        m.codigo                 AS material_codigo,
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
        LEFT JOIN usuarios   uc ON uc.id = d.id_comprador;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_historial_bi AS
      SELECT
        h.id,
        h.tipo_entidad,
        h.id_referencia,
        h.estado_anterior,
        h.estado_nuevo,
        h.fecha,
        u.nombre AS usuario_nombre,
        u.rol    AS usuario_rol
      FROM historial_estados h
        LEFT JOIN usuarios u ON u.id = h.id_usuario;
    `);
  }

  /**
   * ⚠️  ROLLBACK COMPLETO — DESTRUYE TODO EL SCHEMA
   *
   * Este método elimina TODAS las tablas, tipos, funciones, triggers y vistas.
   * Está pensado EXCLUSIVAMENTE para:
   *   - Entornos de desarrollo local
   *   - Pipelines de CI/CD con bases efímeras
   *   - Testing automatizado
   *
   * ┌─────────────────────────────────────────────────────────────────┐
   * │  🚫  NO EJECUTAR EN PRODUCCIÓN SIN BACKUP COMPLETO PREVIO     │
   * │      Esta operación es IRREVERSIBLE y causa pérdida total      │
   * │      de datos.                                                 │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * En producción, los rollbacks deben hacerse mediante migraciones
   * inversas específicas (ALTER TABLE DROP COLUMN, etc.), nunca
   * revirtiendo la baseline completa.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop en orden inverso de dependencia
    await queryRunner.query(`
      DROP VIEW  IF EXISTS vw_historial_bi CASCADE;
      DROP VIEW  IF EXISTS vw_detalles_bi  CASCADE;
      DROP VIEW  IF EXISTS vw_pedidos_bi   CASCADE;

      DROP TRIGGER IF EXISTS trg_detalle_upd    ON detalle_pedido;
      DROP TRIGGER IF EXISTS trg_pedidos_upd    ON pedidos;
      DROP TRIGGER IF EXISTS trg_materiales_upd ON materiales;
      DROP TRIGGER IF EXISTS trg_usuarios_upd   ON usuarios;

      DROP FUNCTION IF EXISTS generar_numero_solicitud CASCADE;
      DROP FUNCTION IF EXISTS actualizar_fecha_modif   CASCADE;
      DROP FUNCTION IF EXISTS actualizar_timestamp     CASCADE;

      DROP TABLE IF EXISTS evento_outbox      CASCADE;
      DROP TABLE IF EXISTS historial_estados  CASCADE;
      DROP TABLE IF EXISTS detalle_pedido     CASCADE;
      DROP TABLE IF EXISTS pedidos            CASCADE;
      DROP TABLE IF EXISTS solicitud_contador CASCADE;
      DROP TABLE IF EXISTS materiales         CASCADE;
      DROP TABLE IF EXISTS usuario_categorias CASCADE;
      DROP TABLE IF EXISTS usuarios           CASCADE;
      DROP TABLE IF EXISTS unidades           CASCADE;
      DROP TABLE IF EXISTS categorias         CASCADE;
      DROP TABLE IF EXISTS sectores           CASCADE;

      DROP TYPE IF EXISTS entidad_historial CASCADE;
      DROP TYPE IF EXISTS estado_detalle    CASCADE;
      DROP TYPE IF EXISTS estado_pedido     CASCADE;
      DROP TYPE IF EXISTS usuario_rol       CASCADE;
    `);
  }
}
