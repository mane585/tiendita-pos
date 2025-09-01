# Tiendita POS (Next.js + Supabase)

Sistema web para punto de venta, inventario y estadísticas pensado para una tiendita local.
Optimizado para tablet y móvil. Gratis con Supabase (DB y Auth) + Vercel (hosting).

## Funcionalidades
- Catálogo con categorías, precio, costo y stock
- Registro de compras (ingresos de inventario) y ventas (con cambio)
- Actualización automática de stock
- Dashboard con totales del día, semana, mes y productos más vendidos
- Búsqueda y filtro por categorías
- Multiusuario opcional (Auth por magic link de Supabase)

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres + Auth + RPC)
- TailwindCSS
- Zustand (estado del carrito)

## Despliegue rápido
1. Crea proyecto en [Supabase](https://supabase.com/). Copia `NEXT_PUBLIC_SUPABASE_URL` y `ANON_KEY`.
2. En Supabase -> SQL Editor, pega y ejecuta el contenido de `supabase/schema.sql`.
3. En Supabase -> Database -> Functions, confirma que `perform_sale` aparece y está habilitada.
4. Crea un proyecto en Vercel y enlaza este repo (o sube el ZIP). Añade variables de entorno del `.env.example`.
5. `npm install` y `npm run build` (local o en CI). Inicia con `npm start` o deja que Vercel lo maneje.
6. Abre `/` para dashboard, `/pos` para ventas, `/inventory` y `/categories` para administración, `/reports` para gráficos.

## Notas
- Si usas la app sin crear cuenta, pon `DISABLE_AUTH=true` temporalmente. **Para producción, mantén auth activa.**
- Todos los datos están asociados a `owner_id = auth.uid()`. Cada usuario ve solo su tienda.
