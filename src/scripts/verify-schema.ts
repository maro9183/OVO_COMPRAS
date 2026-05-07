/**
 * verify-schema.ts — Verificación de drift ORM ↔ DB
 *
 * Ejecutar con:
 *   npx ts-node src/scripts/verify-schema.ts
 *
 * Compara las entities TypeORM contra las tablas reales en PostgreSQL
 * y reporta cualquier discrepancia (columnas faltantes, tipos incorrectos, etc.)
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'ovo_user',
    password: process.env.POSTGRES_PASSWORD || 'ovo_pass',
    database: process.env.POSTGRES_DB || 'ovo_compras',
    entities: [join(__dirname, '/../modules/**/*.entity.{ts,js}')],
    synchronize: false,
  });

  await ds.initialize();
  console.log('✅ Conectado a la base de datos\n');

  // 1. Check for zombie tables
  console.log('═══════════════════════════════════════');
  console.log('§1 — TABLAS ZOMBIE');
  console.log('═══════════════════════════════════════');
  const zombies = ['roles', 'usuarios_roles', 'categoria_comprador', 'pedido_items', 'pedido_historial'];
  for (const z of zombies) {
    const exists = await ds.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`,
      [z]
    );
    const status = exists[0].exists ? '🔴 EXISTE (zombie)' : '✅ No existe';
    console.log(`  ${z}: ${status}`);
  }

  // 2. Check expected tables exist
  console.log('\n═══════════════════════════════════════');
  console.log('§2 — TABLAS ESPERADAS');
  console.log('═══════════════════════════════════════');
  const expected = [
    'sectores', 'categorias', 'unidades', 'usuarios', 'usuario_categorias',
    'materiales', 'solicitud_contador', 'pedidos', 'detalle_pedido',
    'historial_estados', 'evento_outbox'
  ];
  for (const t of expected) {
    const exists = await ds.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`,
      [t]
    );
    const status = exists[0].exists ? '✅ Existe' : '🔴 FALTA';
    console.log(`  ${t}: ${status}`);
  }

  // 3. Check ENUMs
  console.log('\n═══════════════════════════════════════');
  console.log('§3 — TIPOS ENUM');
  console.log('═══════════════════════════════════════');
  const expectedEnums = ['usuario_rol', 'estado_pedido', 'estado_detalle', 'entidad_historial'];
  const obsoleteEnums = ['pedido_estado'];
  for (const e of expectedEnums) {
    const exists = await ds.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname=$1)`, [e]);
    const status = exists[0].exists ? '✅ Existe' : '🔴 FALTA';
    console.log(`  ${e}: ${status}`);
  }
  for (const e of obsoleteEnums) {
    const exists = await ds.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname=$1)`, [e]);
    const status = exists[0].exists ? '🔴 ZOMBIE' : '✅ No existe';
    console.log(`  ${e}: ${status}`);
  }

  // 4. Check zombie columns on categorias
  console.log('\n═══════════════════════════════════════');
  console.log('§4 — COLUMNAS ZOMBIE EN CATEGORIAS');
  console.log('═══════════════════════════════════════');
  const zombieCols = ['created_at', 'updated_at', 'sector_id', 'id_sector'];
  for (const col of zombieCols) {
    const exists = await ds.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categorias' AND column_name=$1)`,
      [col]
    );
    const status = exists[0].exists ? '🔴 EXISTE (zombie)' : '✅ Limpio';
    console.log(`  categorias.${col}: ${status}`);
  }

  // 5. Check functions
  console.log('\n═══════════════════════════════════════');
  console.log('§5 — FUNCIONES PL/pgSQL');
  console.log('═══════════════════════════════════════');
  const funcs = ['generar_numero_solicitud', 'actualizar_timestamp', 'actualizar_fecha_modif'];
  for (const f of funcs) {
    const exists = await ds.query(
      `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname=$1)`, [f]
    );
    const status = exists[0].exists ? '✅ Existe' : '🔴 FALTA';
    console.log(`  ${f}(): ${status}`);
  }

  // 6. Check views
  console.log('\n═══════════════════════════════════════');
  console.log('§6 — VISTAS BI');
  console.log('═══════════════════════════════════════');
  const views = ['vw_pedidos_bi', 'vw_detalles_bi', 'vw_historial_bi'];
  for (const v of views) {
    const exists = await ds.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name=$1)`,
      [v]
    );
    const status = exists[0].exists ? '✅ Existe' : '⚠️ No existe (opcional)';
    console.log(`  ${v}: ${status}`);
  }

  // 7. ORM drift: compare entity metadata with actual columns
  console.log('\n═══════════════════════════════════════');
  console.log('§7 — DRIFT ORM ↔ DB');
  console.log('═══════════════════════════════════════');

  let driftCount = 0;
  for (const meta of ds.entityMetadatas) {
    const tableName = meta.tableName;
    const dbCols: Array<{column_name: string}> = await ds.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [tableName]
    );
    const dbColNames = new Set(dbCols.map(c => c.column_name));

    for (const col of meta.columns) {
      const dbName = col.databaseName;
      if (!dbColNames.has(dbName)) {
        console.log(`  🔴 ${tableName}.${dbName} — en Entity pero NO en DB`);
        driftCount++;
      }
    }

    // Check DB columns not in entity (excluding generated columns)
    const entityColNames = new Set(meta.columns.map(c => c.databaseName));
    for (const dbCol of dbColNames) {
      if (!entityColNames.has(dbCol)) {
        console.log(`  ⚠️  ${tableName}.${dbCol} — en DB pero NO en Entity`);
        driftCount++;
      }
    }
  }

  if (driftCount === 0) {
    console.log('  ✅ Sin drift detectado');
  } else {
    console.log(`\n  Total: ${driftCount} discrepancias encontradas`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('RESUMEN');
  console.log('═══════════════════════════════════════');
  console.log(driftCount === 0
    ? '✅ Schema validado — sin discrepancias'
    : `⚠️  Se encontraron ${driftCount} discrepancias — revisar arriba`
  );

  await ds.destroy();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
