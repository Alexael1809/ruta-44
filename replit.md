# Marketplace de Repuestos

Marketplace venezolano para encontrar repuestos, comparar inventario local, comprar con precios en USD/Bs y administrar pedidos, pagos e inventario.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/repuestos-marketplace` — tienda pública, carrito, checkout y paneles operativos.
- `artifacts/api-server` — API Express, autenticación Clerk, reglas de acceso y endpoints del marketplace.
- `lib/api-spec/openapi.yaml` — contrato único de la API; ejecutar codegen después de cambios.
- `lib/db/src/schema/marketplace.ts` — tablas y tipos persistentes del marketplace.

## Architecture decisions

- Se usa PostgreSQL administrado por Replit en lugar de Supabase para mantener la base de datos dentro del entorno del proyecto; el servidor aplica el aislamiento por rol y comerciante.
- Clerk gestiona las sesiones y Google/email-password quedan configurables desde Auth; el navegador usa cookies same-origin, sin tokens manuales.
- La tasa de cambio se guarda en cada orden para que los totales históricos no cambien al actualizar la tasa del día.
- La referencia de pago móvil tiene un índice único en base de datos para rechazar duplicados incluso bajo solicitudes simultáneas.
- Los bytes de imágenes no se guardan en PostgreSQL; el esquema deja `imageUrl` listo para migrar a almacenamiento de objetos/CDN.

## Product

Catálogo público paginado con búsqueda y categorías, detalle de producto, carrito persistente, checkout con cálculo USD/Bs, pagos móviles, seguimiento de pedidos, inventario CRUD para comerciantes y resumen administrativo.

## User preferences

- El usuario pidió implementar y ajustar lo necesario a partir de la especificación por fases del marketplace.

## Gotchas

- Después de cambiar `lib/api-spec/openapi.yaml`, ejecutar `pnpm --filter @workspace/api-spec run codegen`.
- Los builds de Vite requieren `PORT` y `BASE_PATH`; los workflows los inyectan automáticamente.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
