# Migraciones — Convenciones y Guía

## Estructura actual

```
src/migrations/
├── 0001-CleanBaseline.ts    ← Schema base consolidado
├── _archived/               ← Migraciones históricas (referencia)
└── README.md                ← Este archivo
```

## Naming

```
NNNN-DescripcionCorta.ts
```

- `NNNN`: secuencial de 4 dígitos (0001, 0002, ...)
- `DescripcionCorta`: PascalCase, sin prefijos de fecha
- Ejemplos:
  - `0002-AddProveedoresTable.ts`
  - `0003-AddCotizacionesModule.ts`
  - `0004-AlterPedidoAddUrgencia.ts`

## Cuándo crear migraciones

| Cambio | Tipo de migración |
|--------|------------------|
| Nueva tabla | Manual — `CREATE TABLE` con todos los constraints |
| Nueva columna | Manual — `ALTER TABLE ADD COLUMN` |
| Cambio de ENUM | Manual — patrón rename+create+cast+drop (ver abajo) |
| Nuevo índice | Manual — `CREATE INDEX` |
| Cambio de constraints | Manual |
| Cambio masivo de datos | Manual con transacción |

## Reglas

1. **Una migración = un cambio lógico.** No mezclar cambios no relacionados.
2. **Siempre implementar `down()`.** Debe revertir el `up()` completamente.
3. **Usar `IF NOT EXISTS` / `IF EXISTS`** en DDL para idempotencia.
4. **Nunca usar `synchronize: true`** en producción ni desarrollo.
5. **No usar migraciones auto-generadas** (`typeorm migration:generate`). El schema se gestiona manualmente.
6. **Documentar** el propósito de cada migración en un comentario al inicio del archivo.

## Patrón para actualizar ENUMs de PostgreSQL

```sql
-- 1. Renombrar el enum viejo
ALTER TYPE estado_pedido RENAME TO estado_pedido_old;

-- 2. Crear el nuevo con los valores actualizados
CREATE TYPE estado_pedido AS ENUM ('VALOR1', 'VALOR2', 'NUEVO_VALOR');

-- 3. Actualizar columnas que usan el enum
ALTER TABLE pedidos
  ALTER COLUMN id_estado DROP DEFAULT,
  ALTER COLUMN id_estado TYPE estado_pedido
    USING id_estado::text::estado_pedido,
  ALTER COLUMN id_estado SET DEFAULT 'VALOR1';

-- 4. Eliminar el enum viejo
DROP TYPE estado_pedido_old;
```

> **Importante:** Si existen vistas que referencian las columnas con el enum,
> deben droppearse ANTES del cambio y recrearse DESPUÉS.

## Patrón para vistas BI

Las vistas `vw_*_bi` son capa analítica opcional. Si una migración toca
columnas o ENUMs referenciados por alguna vista:

```sql
-- Al inicio del up()
DROP VIEW IF EXISTS vw_afectada CASCADE;

-- ... cambios ...

-- Al final del up()
CREATE OR REPLACE VIEW vw_afectada AS ...;
```

## Ejecución

```bash
# Producción — las migraciones corren automáticamente (migrationsRun: true)
npm run start:prod

# Desarrollo — correr manualmente
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/config/data-source.ts

# Revertir última migración
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d src/config/data-source.ts
```

## Para bases existentes (registro manual de baseline)

Si la base de datos ya tiene el schema actual y solo se necesita
registrar la baseline como ejecutada:

```sql
INSERT INTO migrations (timestamp, name)
VALUES (1746633000000, 'CleanBaseline1746633000000');
```
