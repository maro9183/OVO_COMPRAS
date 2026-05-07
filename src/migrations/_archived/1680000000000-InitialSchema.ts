// src/migrations/1680000000000-InitialSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1680000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- USERS & ROLES ----------
    await queryRunner.query(`
      CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR NOT NULL UNIQUE,
        nombre VARCHAR NOT NULL,
        password_hash VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`
      CREATE TABLE roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`
      CREATE TABLE usuarios_roles (
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (usuario_id, rol_id)
      );
    `);

    // ---------- SECTORES & CATEGORIAS ----------
    await queryRunner.query(`
      CREATE TABLE sectores (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`
      CREATE TABLE categorias (
        id SERIAL PRIMARY KEY,
        sector_id INTEGER REFERENCES sectores(id) ON DELETE RESTRICT,
        nombre VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sector_id, nombre)
      );
    `);

    // ---------- CATEGORIA COMPRADOR ----------
    await queryRunner.query(`
      CREATE TABLE categoria_comprador (
        id SERIAL PRIMARY KEY,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE RESTRICT,
        comprador_id INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
        disponibilidad INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(categoria_id, comprador_id)
      );
    `);

    // ---------- PEDIDOS & ITEMS ----------
    await queryRunner.query(`
      CREATE TYPE pedido_estado AS ENUM ('PENDIENTE_VALIDACION','VALIDADO','RECHAZADO','SOLICITADO','ENTREGADO');
    `);
    await queryRunner.query(`
      CREATE TABLE pedidos (
        id SERIAL PRIMARY KEY,
        numero_solicitud VARCHAR NOT NULL UNIQUE,
        solicitante_id INTEGER NOT NULL REFERENCES usuarios(id),
        comprador_id INTEGER REFERENCES usuarios(id),
        estado pedido_estado NOT NULL,
        sector_id INTEGER REFERENCES sectores(id),
        categoria_id INTEGER REFERENCES categorias(id),
        descripcion VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (estado = 'PENDIENTE_VALIDACION' AND comprador_id IS NULL) OR
          (estado <> 'PENDIENTE_VALIDACION' AND comprador_id IS NOT NULL)
        )
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_pedidos_estado ON pedidos (estado);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_pedidos_comprador_estado ON pedidos (comprador_id, estado) WHERE estado = 'SOLICITADO';
    `);
    await queryRunner.query(`
      CREATE TABLE pedido_items (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
        descripcion TEXT NOT NULL,
        cantidad INTEGER NOT NULL CHECK (cantidad > 0),
        precio NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ---------- SOLICITUD CONTADOR ----------
    await queryRunner.query(`
      CREATE TABLE solicitud_contador (
        id SERIAL PRIMARY KEY,
        año INTEGER NOT NULL,
        secuencial INTEGER NOT NULL,
        UNIQUE(año, secuencial)
      );
    `);

    // ---------- EVENTO OUTBOX ----------
    await queryRunner.query(`
      CREATE TABLE evento_outbox (
        id SERIAL PRIMARY KEY,
        aggregate_id VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        payload JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_outbox_processed_created ON evento_outbox (processed, created_at) WHERE NOT processed;
    `);

    // ---------- PEDIDO HISTORIAL ----------
    await queryRunner.query(`
      CREATE TABLE pedido_historial (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
        estado_anterior pedido_estado,
        estado_nuevo pedido_estado NOT NULL,
        cambiado_por INTEGER REFERENCES usuarios(id),
        cambio_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ---------- TRIGGERS ----------
    await queryRunner.query(`
      CREATE FUNCTION actualizar_timestamp() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    const tables = ['usuarios','roles','sectores','categorias','categoria_comprador','pedidos','pedido_items','solicitud_contador','evento_outbox','pedido_historial'];
    for (const t of tables) {
      await queryRunner.query(`
        CREATE TRIGGER trg_${t}_updated_at BEFORE UPDATE ON ${t}
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      `);
    }

    // ---------- FUNCION numero_solicitud ----------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generar_numero_solicitud() RETURNS VARCHAR AS $$
      DECLARE
        año_actual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
        sec_seq INTEGER;
        result VARCHAR;
      BEGIN
        PERFORM pg_advisory_xact_lock(año_actual);
        SELECT COALESCE(MAX(secuencial), 0) + 1 INTO sec_seq FROM solicitud_contador WHERE año = año_actual;
        INSERT INTO solicitud_contador (año, secuencial) VALUES (año_actual, sec_seq);
        result := format('SOL-%s-%s', año_actual, lpad(sec_seq::text, 6, '0'));
        RETURN result;
      END;
      $$ LANGUAGE plpgsql VOLATILE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP FUNCTION IF EXISTS generar_numero_solicitud();');
    await queryRunner.query('DROP TYPE IF EXISTS pedido_estado;');
    const tables = ['pedido_historial','evento_outbox','solicitud_contador','pedido_items','pedidos','categoria_comprador','categorias','sectores','roles','usuarios','usuarios_roles'];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
    }
  }
}
