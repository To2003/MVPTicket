# Algo Lindo · Ticketera (MVP)

Web para vender entradas online y mostrar la marca de un emprendimiento de eventos.
Incluye la web pública, la compra con Mercado Pago (o un **modo demo** sin pagos reales), entradas con QR por mail, panel de administración, escáner de puerta y una **Simulación** guiada para mostrarle a la clienta cómo funciona todo.

- Stack: Next.js 15 (App Router) + TypeScript + Tailwind v4 · Postgres (Supabase) · Mercado Pago Checkout Pro · Resend.
- Sin Docker: en local usa un Postgres embebido que se descarga e instala solo vía npm.
- Documentos del proyecto: [`SPEC.md`](SPEC.md) (qué y cómo), [`DECISIONES.md`](DECISIONES.md) (decisiones tomadas), [`INFORME_NOCHE.md`](INFORME_NOCHE.md) (estado actual).

---

## Arranque rápido (modo demo, sin cuentas)

Requisitos: **Node 20.9 o más nuevo** y npm. Nada más.

```bash
npm install
```

```bash
npm run dev
```

La primera vez, `npm run dev`:

1. crea `.env.local` con secretos aleatorios (`DEMO_MODE=true`, Postgres embebido);
2. levanta Postgres embebido en `.data/pg` (puerto 54329) y aplica las migraciones;
3. carga los datos de ejemplo (3 eventos, órdenes, galería, consultas);
4. arranca Next en <http://localhost:3000>.

| Qué | Dónde |
|---|---|
| Web pública | <http://localhost:3000> |
| Simulación guiada | <http://localhost:3000/simulacion> (o el botón **Simulación** del header) |
| Panel | <http://localhost:3000/admin> — mail `admin@algolindo.test`, contraseña = `SEED_ADMIN_PASSWORD` en tu `.env.local` |
| Escáner de puerta | <http://localhost:3000/admin/escaner> |
| Mails "enviados" | Consola de `npm run dev` y copias navegables en `.data/outbox/*.html` |

Para volver a los datos de ejemplo en cualquier momento: `npm run seed` (borra y recarga).

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Todo lo de arriba (base + migraciones + seed si está vacía + Next en modo desarrollo). |
| `npm run setup` | Crea `.env.local` desde `.env.example` con secretos nuevos (no pisa uno existente). |
| `npm run seed` | Borra y recarga los datos de ejemplo. |
| `npm run db:migrate` | Aplica las migraciones de `supabase/migrations/` a `DATABASE_URL`. |
| `npm run db:start` | Deja corriendo solo el Postgres embebido (útil para `npm start`). |
| `npm run build` / `npm start` | Build y servidor de producción (con la base ya levantada). |
| `npm test` | Tests (Vitest) contra un Postgres real; si no hay `TEST_DATABASE_URL`, levanta uno embebido aparte. |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript. |
| `npm run placeholders` | Regenera los flyers y fotos SVG de ejemplo de `public/seed`. |

---

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Resumen:

| Variable | Para qué | Local (demo) |
|---|---|---|
| `APP_URL` | URL pública (back_urls de MP y links de los mails) | `http://localhost:3000` |
| `DEMO_MODE` | `true`: botón "Simular pago aprobado". `false`: Mercado Pago real (sandbox con credenciales de prueba) | `true` |
| `NEXT_PUBLIC_SHOW_SIMULATION` | Muestra el botón **Simulación** y habilita `/simulacion` | `true` |
| `DATABASE_URL` | Conexión a Postgres (embebido o Supabase) | embebido |
| `EMBEDDED_POSTGRES` | `true`: si no hay base en `DATABASE_URL`, levanta la embebida | `true` |
| `TEST_DATABASE_URL` | Base para tests (opcional) | vacío |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Si están: Supabase Auth (login) y Storage (flyers). Si no: modo local | vacías |
| `ADMIN_EMAILS` | Mails con acceso al panel, separados por coma | `admin@algolindo.test` |
| `SEED_ADMIN_PASSWORD` | Contraseña del admin (modo local) / con la que el seed crea el usuario en Supabase | generada |
| `TICKET_HMAC_SECRET` | Firma de los QR (mín. 32 caracteres). Si cambia, las entradas emitidas dejan de validar | generada |
| `MP_ACCESS_TOKEN` | Access token **de prueba** de Mercado Pago | vacío |
| `MP_WEBHOOK_SECRET` | (Opcional) valida la firma `x-signature` de los webhooks | vacío |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envío real de mails. Sin key: consola + `.data/outbox` | vacío |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número para los botones de WhatsApp | ejemplo |

> Las variables `NEXT_PUBLIC_*` se "hornean" en el build: si las cambiás, reiniciá `npm run dev` o volvé a correr `npm run build`.

---

## Probar el flujo completo en modo demo

1. Entrá a <http://localhost:3000>, tocá **Noche de Vinilos & Vermú**, sumá entradas y **Comprar**.
2. Completá nombre, mail y DNI → **Reservar y pagar**. Las entradas quedan reservadas 10 minutos (hay cuenta regresiva).
3. Tocá **Simular pago aprobado**. Recorre exactamente el mismo camino que un pago real de Mercado Pago: confirma la orden, genera una entrada con QR por unidad y "manda" el mail.
4. Vas a ver las entradas en pantalla. El mail queda en la consola y en `.data/outbox/` (abrilo con el navegador).
5. Abrí una entrada (**Abrir esta entrada sola**): es la página `/entrada/<token>` que se ve en la puerta.
6. Entrá al panel (`/admin`): la compra aparece en **Ventas**. Probá filtrar, buscar, exportar, cambiar el titular y anular.
7. **Escáner** (`/admin/escaner`): elegí el evento y tipeá el código corto de una entrada (el que figura debajo del QR). La primera vez da **verde**, la segunda **amarillo** con la hora, una anulada o inventada da **rojo**. Con cámara: ver "Escáner desde el celu" más abajo.

---

## Pasar a Mercado Pago sandbox (pagos de prueba reales)

1. Entrá a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app) → **Crear aplicación** (Checkout Pro).
2. En **Credenciales de prueba** copiá el **Access Token** (`TEST-…` o `APP_USR-…` de la cuenta de prueba).
3. En **Cuentas de prueba** creá un usuario **comprador** (para pagar) — no pagues con tu cuenta real.
4. En `.env.local`:
   ```
   DEMO_MODE=false
   MP_ACCESS_TOKEN=<access token de prueba>
   ```
5. Reiniciá `npm run dev` y comprá una entrada. Te redirige al checkout de Mercado Pago. Logueate con el comprador de prueba y pagá con una [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards). Con nombre del titular `APRO` el pago sale aprobado; con `OTHE`, rechazado; con `CONT`, pendiente.
6. Al volver de Mercado Pago (**Volver al sitio**), la página `/compra/exito` consulta el pago a la API de MP y confirma la orden. Así funciona en `localhost` aunque Mercado Pago no pueda llegar a tu máquina con el webhook.

**Webhook (recomendado para probar como en producción):** MP necesita una URL pública `https`. Con un túnel (por ejemplo `cloudflared tunnel --url http://localhost:3000` o `ngrok http 3000`):

1. Poné la URL del túnel en `APP_URL` (ej. `https://algo.trycloudflare.com`). Con `https` la app activa `auto_return` y manda `notification_url` en cada preferencia.
2. (Opcional) En tu app de MP → **Webhooks**, configurá `https://<tu-túnel>/api/webhooks/mercadopago` con el evento **Pagos**, copiá la **clave secreta** y ponela en `MP_WEBHOOK_SECRET` para validar la firma.

Qué hace el webhook: no confía en el aviso. Consulta el pago a la API de MP, valida monto, moneda y referencia, y recién ahí confirma. Es idempotente (avisos repetidos o simultáneos no duplican entradas ni mails) y tolera avisos tardíos o desordenados. Si un pago llega con la reserva vencida y ya no hay cupo, la orden queda **"A devolver"** y aparece como alerta en el panel (la devolución se hace desde Mercado Pago).

---

## Usar Supabase (para producción o para compartir la base)

1. Creá un proyecto en [supabase.com](https://supabase.com) (plan free, no pide tarjeta).
2. En `.env.local`:
   - `DATABASE_URL`: *Project Settings → Database → Connection string → URI* (usá el **Session pooler**, puerto 5432) y `EMBEDDED_POSTGRES=false`.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: *Project Settings → API*.
3. `npm run db:migrate` (crea tablas, funciones, RLS y el bucket público `flyers`).
4. `npm run seed` (datos de ejemplo + crea en Supabase Auth el usuario del primer mail de `ADMIN_EMAILS` con `SEED_ADMIN_PASSWORD`).
5. En Supabase → *Authentication → Sign In / Providers*: **desactivá "Allow new users to sign up"**. Los admins se crean desde el dashboard (*Authentication → Users → Add user*) y además tienen que estar en `ADMIN_EMAILS`.

Con las variables de Supabase completas, el login pasa a Supabase Auth y los flyers se suben a Supabase Storage automáticamente.

---

## Escáner desde el celu

- El navegador solo deja usar la cámara en `https` o en `localhost`. Para probar desde el celu en la misma red, usá un túnel `https` (ver arriba) y entrá a `https://<tu-túnel>/admin/escaner`.
- En el celu, **Compartir → Agregar a pantalla de inicio**: queda como app ("Puerta") que abre directo el escáner.
- Si el QR no se lee, se tipea el código corto que aparece debajo del QR (ej. `K7M-Q9PX-3RT`).

---

## Sacar el botón "Simulación"

En las variables de entorno de producción poné:

```
NEXT_PUBLIC_SHOW_SIMULATION=false
```

y volvé a hacer el build (`npm run build`). Desaparece el botón del header y del menú mobile, y `/simulacion` devuelve 404. El código vive en `src/components/simulation/` y `src/app/simulacion/`: si más adelante no se usa más, se pueden borrar esas dos carpetas.

---

## Cambiar la identidad (reskin)

- **Colores, tipografías y radios:** `src/styles/theme.css` (variables `--brand-*`). Las clases de Tailwind (`bg-primary`, `text-accent`, `font-display`…) salen de ahí.
- **Tipografías:** los imports están en `src/styles/fonts.ts` (fuentes self-hosted vía `@fontsource`).
- **Nombre, logo, textos de la home y de "Quiénes somos", WhatsApp, Instagram:** `src/config/brand.ts`. Para usar un logo, dejá el archivo en `public/brand/` y poné la ruta en `logoSrc`.
- **Ícono/favicon:** `src/app/icon.svg` y `public/icons/`.
- **Fotos de la galería:** tabla `gallery_photos` (hoy las carga el seed desde `public/seed/galeria`).

---

## Tests

```bash
npm test
```

Corren contra un Postgres real (embebido, en el puerto 54330 y con su propia base, así no tocan tus datos). Cubren:

- **Reserva de cupo:** cupo justo, líneas repetidas, liberación al vencer, eventos no publicados o pasados y **concurrencia** (50 compras simultáneas contra cupo 20 → exactamente 20; compras cruzadas de varios tipos sin deadlocks).
- **Pagos/webhook:** confirmación, **idempotencia** (avisos repetidos y 10 en paralelo → una sola confirmación y un solo mail), avisos fuera de orden, monto/moneda/referencia inválidos, pago tarde con y sin cupo, pago duplicado, mail que falla y se reintenta, modo demo.
- **Token del QR:** firma/verificación, tokens alterados, con otro secreto, con otro id, variantes no canónicas, firma de webhooks de MP.
- **Escáner:** verde/amarillo/rojo, código manual, otro evento, anuladas y **lectura simultánea** del mismo QR.
- **RLS:** el rol público solo ve eventos publicados y no puede leer órdenes, entradas ni ejecutar funciones sensibles.
- **Admin:** edición de cupo/precio con sus reglas, slugs únicos, cambio de titular, anulación y CSV.

---

## Estructura

```
supabase/migrations/   SQL: esquema, funciones (reserve_order, confirm_order, scan_ticket…), RLS
scripts/               dev, seed, migraciones, setup, Postgres embebido, placeholders
src/app/(public)/      web pública: home, evento, checkout, compra, entrada, quiénes somos, contacto
src/app/admin/         login y panel (eventos, ventas, consultas, escáner)
src/app/api/           webhook de MP, escáner, export CSV, archivos locales
src/app/simulacion/    simulación guiada
src/components/        UI reutilizable (la usan la web, el panel y la simulación)
src/lib/               datos, pagos, órdenes, tokens, mails, auth, storage, validación
tests/                 Vitest
```

## Seguridad (resumen)

- RLS activado en todas las tablas; el público solo lee eventos publicados, sus tipos de entrada, la disponibilidad agregada y la galería.
- Reserva, confirmación, escaneo y todo el panel corren del lado del servidor; las funciones SQL sensibles no son ejecutables por el rol público.
- Validación con zod en el servidor; rate limit (en Postgres) para checkout, contacto y login.
- QR firmados con HMAC-SHA256 (comparación en tiempo constante, codificación canónica).
- Secretos solo en variables de entorno del servidor. `.env.local` está en `.gitignore`.
- Export CSV protegido contra fórmulas de Excel; flyers validados por contenido (JPG/PNG/WEBP, máx. 5 MB).
