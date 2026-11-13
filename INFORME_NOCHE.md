# Informe de la noche

**Estado:** los 5 hitos y el hito extra (Simulación) están terminados, verificados y subidos a `main` en [To2003/MVPTicket](https://github.com/To2003/MVPTicket). En modo demo funciona todo de punta a punta: comprar, recibir las entradas, verlas en el panel, escanearlas en la puerta y recorrer la Simulación.

**Lo único que no pude probar con servicios reales:** Supabase, Mercado Pago y Resend. No había credenciales; ver [Bloqueos](#bloqueos-y-cosas-a-medias). Todo quedó implementado y con tests (la API de MP mockeada). Para conectarlos alcanza con completar variables de entorno.

---

## Cómo levantarlo

```bash
npm install
```

```bash
npm run dev
```

La primera vez crea `.env.local` (modo demo + Postgres embebido), levanta la base, aplica las migraciones y carga el seed. Después abrí <http://localhost:3000>. No hace falta Docker ni cuentas. Los detalles están en el [README](README.md).

## Admin de prueba

- **Panel:** <http://localhost:3000/admin>
- **Mail:** `admin@algolindo.test`
- **Contraseña:** es el valor de `SEED_ADMIN_PASSWORD` en tu `.env.local`. Se genera sola la primera vez que corrés `npm run dev` (o `npm run setup`) con el formato `AlgoLindo-` + 8 caracteres hexadecimales. No la escribo acá ni aparece en ningún log. Si querés otra, cambiala en `.env.local` y reiniciá.

---

## Qué quedó hecho, por hito

| Hito | Commit | Qué incluye |
|---|---|---|
| 1 | `19215b2` | Next 15 + Tailwind v4. Identidad centralizada en `theme.css` y `brand.ts`. Migraciones SQL con esquema, funciones y **RLS en todas las tablas**. Postgres embebido para dev y tests. Seed. Web pública con datos reales: home, evento, quiénes somos con galería, contacto con WhatsApp y formulario. |
| 2 | `f8a7aab` | Checkout con zod y rate limit. **Reserva atómica de 10 min** (función SQL con locks). Preferencia de Mercado Pago sin efectivo ni cuotas. Botón **"Simular pago aprobado"**. **Webhook idempotente** que consulta el pago a la API de MP y valida monto, moneda y referencia. Entradas con **QR firmado (HMAC)**, página `/entrada/[token]` y mail con los QR. |
| 3 | `8eca9b5` | Panel `/admin`: login (Supabase Auth o local) limitado a `ADMIN_EMAILS`. Eventos (crear, editar, flyer, publicar). Ventas (órdenes y asistentes con filtros, búsqueda y totales). Cambiar titular y anular. Consultas. **Export CSV para Excel**. Mobile-first, con barra inferior en el celu. |
| 4 | `a47eb4a` | **Escáner** `/admin/escaner`: cámara, resultado a pantalla completa en verde, amarillo (con la hora) o rojo, vibración y sonido, código manual y contador de ingresos. PWA instalable que abre directo el escáner. |
| Extra | `ac7b6f1` | **Simulación** `/simulacion` con dos recorridos: "Así compra tu cliente" (7 pasos) y "Así lo manejan ustedes" (9 pasos interactivos). Tiene barra de progreso, pasos clickeables, globos y resaltados, y un cierre con "Qué incluye" y "Qué no incluye esta versión". Usa los componentes reales con datos ficticios en memoria. Se apaga con `NEXT_PUBLIC_SHOW_SIMULATION=false`. |
| 5 | (último commit) | Pulido visual y responsive. Arreglé el menú mobile, que se veía transparente (lo atrapaba el `backdrop-blur` del header). Galería sin huecos, estados vacíos y de error (también en el panel), link "Saltar al contenido", metadata, `npm run setup`, README y este informe. |

---

## Resultados de verificación (última corrida)

| Chequeo | Resultado |
|---|---|
| `npm run lint` | ✅ sin errores ni warnings |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ compila (todas las rutas) |
| `npm test` | ✅ **52 tests en verde** (6 archivos) |
| Build con `NEXT_PUBLIC_SHOW_SIMULATION=false` | ✅ `/simulacion` da 404 y el botón no aparece |

Qué cubren los tests, contra un Postgres real:

- **Reserva** (7 tests), incluidos:
  - 50 compras simultáneas contra cupo 20 → exactamente 20 OK y 30 sin cupo;
  - compras cruzadas de dos tipos de entrada en orden inverso → sin deadlocks ni sobreventa.
- **Pagos y webhook** (14 tests), incluidos:
  - el mismo aviso 2 veces, y 10 avisos en paralelo → una sola confirmación, entradas exactas y un solo mail;
  - avisos fuera de orden;
  - monto, moneda o referencia inválidos;
  - pago tarde con y sin cupo, pago duplicado;
  - mail que falla y se reintenta;
  - error de la API de MP;
  - modo demo (también con doble click).
- **Token QR y firma de webhooks de MP** (9 tests). Uno de estos tests encontró un detalle real: un token con el último carácter cambiado se seguía aceptando. No permitía falsificar entradas, pero sí tener dos tokens para la misma. Lo corregí exigiendo la codificación canónica.
- **Escáner** (5 tests), incluida la lectura simultánea del mismo QR desde 8 celulares → un solo OK.
- **RLS** (12 tests): el rol público solo ve eventos publicados y no puede leer órdenes, entradas, pagos ni consultas, ni ejecutar las funciones sensibles.
- **Admin y CSV** (5 tests): reglas de cupo y precio, slugs únicos, cambio de titular, anulación y protección contra fórmulas de Excel.

## Smoke test final (server levantado con `npm run dev`)

Rutas:

| Ruta | Resultado |
|---|---|
| `/` | 200 |
| `/eventos/noche-de-vinilos-y-vermu` | 200 |
| `/eventos/cumbia-en-la-terraza` | 200 |
| `/quienes-somos` | 200 |
| `/contacto` | 200 |
| `/simulacion` | 200 |
| `/admin/login` | 200 |
| `/manifest.webmanifest` | 200 |
| `/eventos/no-existe` | 404 ✅ |
| `/admin` sin login | 307 → `/admin/login` ✅ |
| `/api/admin/ventas/export` sin login | 401 ✅ |

Flujo de punta a punta en un navegador headless (Playwright, viewport de celu):

1. Elegí 1 Anticipada y 1 General → completé los datos → reserva creada con cuenta regresiva (09:57).
2. "Simular pago aprobado" → **2 entradas generadas** con QR y código corto; el mail quedó guardado en `.data/outbox/`.
3. Página de la entrada → 200 con el titular correcto. Con el token alterado → 404.
4. Login admin OK. La orden aparece en Ventas y el export CSV trae las 2 filas.
5. Escáner con el código manual: **ok**, después **ya usada**; con un código inventado, **inválida**.
6. Simulación: 200, con los dos recorridos disponibles.
7. Ningún error de JavaScript en el navegador.

Además, durante el desarrollo:

- Recorrí las dos simulaciones completas en celu (390 px) y desktop (1440 px) sin errores de consola. La descarga del Excel funciona.
- Probé el **escáner con cámara**: le pasé a Chromium un video falso con el QR real de una entrada, y la cámara lo leyó y dio verde y después amarillo.

---

## Decisiones nuevas (detalle en `DECISIONES.md`)

- **D16:** del lado del servidor accedo a Postgres directo (`DATABASE_URL`). Las lecturas públicas corren con el rol `anon`, así aplican las mismas RLS que con la anon key.
- **D17:** las fechas del panel van en hora argentina fija (UTC−3).
- **D18:** **modo local sin Supabase**: Postgres embebido, login con `SEED_ADMIN_PASSWORD` en cookie firmada y flyers guardados en la base. Con las variables de Supabase pasa solo a Supabase Auth y Storage.
- **D19–D20:** flyers con `<img>` común. Los flyers y fotos de ejemplo son SVG generados (desde acá no había acceso a bancos de imágenes).
- **D21:** el link `/compra/[id]` (un UUID imposible de adivinar) funciona como "link privado" de la compra.
- **D22:** sin Resend, cada mail también se guarda en `.data/outbox/`.
- **D23:** CSV con `;` y BOM para Excel en español, respetando los filtros.
- **D24:** en el escáner se elige el evento. Una entrada de otro evento da rojo, el mismo QR se ignora 3 s y el resultado sale a pantalla completa.
- **D25:** `auto_return` y `notification_url` de MP solo se mandan con `APP_URL` en https.
- **D26:** el login tiene rate limit y un mensaje de error genérico.
- **D27:** la Simulación usa los componentes reales con datos en memoria.
- **D28:** el total de la orden lo calcula la base, con el precio congelado al reservar.
- **D29:** `npm run dev` crea `.env.local` y carga el seed solo si hace falta.
- **D30:** "¡Últimas N!" suma todos los tipos de entrada; "Quedan X" es por tipo.
- **D31:** `/compra/[id]` se refresca sola mientras haya un pago pendiente.
- **D32:** un segundo pago aprobado para la misma orden queda marcado como "duplicado" para devolverlo a mano.

---

## Bloqueos y cosas a medias

1. **No había `.env.local` ni credenciales de Supabase.** Seguí tu regla 3:
   - Postgres embebido (`embedded-postgres`) para dev y tests;
   - login local (`ADMIN_EMAILS` + `SEED_ADMIN_PASSWORD`);
   - flyers guardados en una tabla de la base.

   Ya están escritos, pero **no los probé contra un proyecto real de Supabase**:
   - el login con Supabase Auth (con el middleware que refresca la sesión);
   - la subida de flyers a Supabase Storage;
   - la creación del admin en el seed;
   - las migraciones contra Supabase (están pensadas para ser compatibles: los roles `anon`/`authenticated` y el bucket se crean solo si no existen).

   Un punto a mirar cuando lo conectemos: las lecturas públicas hacen `set local role anon`. Si el usuario del pooler de Supabase no puede asumir ese rol, el código cae a la conexión normal (las consultas igual filtran por `is_published`) y lo avisa una vez en el log.
2. **Mercado Pago:** sin credenciales no pude crear una preferencia real ni consultar pagos reales. La lógica del webhook y de las páginas de retorno está testeada con la API de MP mockeada. Faltan dos pruebas manuales en sandbox (los pasos están en el README):
   - el pago completo;
   - la validación de la firma `x-signature` contra un webhook real (la implementé según la documentación de MP).
3. **Resend:** no probé el envío real. Los QR van como adjuntos inline (`cid`) porque Gmail bloquea las imágenes `data:`. Sin key, el mail se ve en consola y en `.data/outbox/`.
4. **Escáner en un celu real:** lo probé con cámara simulada en Chromium, no en un teléfono. Hay que probarlo en iPhone (Safari) y Android. En el celu necesita `https`; para probar desde la misma red hace falta un túnel (está en el README).
5. **Fotos y flyers son placeholders** (SVG ilustrados). Hay que reemplazarlos por material de la clienta.
6. **Textos de "Quiénes somos", la marca "Algo Lindo", el WhatsApp y el Instagram son placeholders** (todo en `src/config/brand.ts`).
7. No hice deploy ni toqué otros servicios externos, como pediste.

---

## Qué probar primero mañana

1. `npm install && npm run dev` y abrir <http://localhost:3000> en el celu o con el modo responsive del navegador.
2. **La Simulación**, con los dos recorridos (botón "Simulación" del header). Es lo que va a ver la clienta.
3. Una compra demo completa: elegir entradas → datos → "Simular pago aprobado" → ver las entradas y abrir el mail en `.data/outbox/`.
4. El panel (`/admin`, la contraseña está en `.env.local`): crear un evento con flyer y publicarlo, buscar tu compra en Ventas, exportar el CSV, cambiar el titular y anular.
5. El escáner con el código corto de una entrada (verde → amarillo → rojo con un código inventado). Si tenés un túnel `https`, probalo con la cámara del celu.
6. Si querés validar los pagos reales: credenciales de prueba de MP + `DEMO_MODE=false` (README → "Pasar a Mercado Pago sandbox").
