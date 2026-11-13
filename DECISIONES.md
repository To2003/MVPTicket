# Decisiones de producto/técnicas no cubiertas por el brief

Criterio: la opción más simple que no rompa nada. Cualquiera se puede vetar.

| # | Decisión | Por qué |
|---|---|---|
| D1 | Supabase **en la nube (plan free)**, no local. | Supabase local requiere Docker, que el brief descarta. El plan free no pide tarjeta. Las migraciones se aplican con `npm run db:migrate` (script Node + `DATABASE_URL`). |
| D2 | Precios en **pesos enteros**, sin centavos. | Nadie cobra entradas con centavos; evita errores de redondeo con MP. |
| D3 | La reserva es la orden `pending` con `expires_at`; **se libera sola** al vencer (deja de contar en el cálculo de cupo). Sin cron. | Menos piezas móviles; imposible que un job caído deje cupo trabado. |
| D4 | La galería de "Quiénes somos" y su texto **no se editan desde el admin**: texto en `src/config/brand.ts`, fotos por seed/SQL. | El brief pide placeholder editable, no un CMS. |
| D5 | Rate limit guardado en **Postgres** (tabla + RPC). | Funciona igual en local y en serverless con varias instancias, sin sumar Redis/Upstash. |
| D6 | "Quedan X" se muestra solo cuando quedan **≤ 20**; si no, "Disponible". Con 0 → "Agotado". | Mostrar "quedan 143" no aporta y revela poca venta. Umbral configurable en `brand.ts`. |
| D7 | Las páginas de retorno de MP (`/compra/exito` etc.) **también** procesan el pago (consultando la API de MP, sin confiar en la query). | Así el sandbox funciona en `localhost` sin túnel para el webhook, y si el webhook se demora el comprador igual ve sus entradas. Es la misma función idempotente. |
| D8 | En el admin no se puede bajar el cupo por debajo de vendidas+reservadas, ni borrar un tipo de entrada con ventas (se puede poner cupo = vendidas para cerrarlo). Cambiar el precio solo afecta compras nuevas. | Evita inconsistencias sin pedir lógica extra. |
| D9 | El cupo se reserva **al enviar el form de checkout** (nombre/email/DNI), no al tocar "Comprar" en la página del evento. | Evita que alguien bloquee entradas solo navegando; los 10' cubren el pago en MP. |
| D10 | Se **excluyen pagos en efectivo** (Rapipago/Pago Fácil/cajero) en la preferencia de MP. | Se acreditan en días; con una reserva de 10' generarían pagos sin cupo. Quedan tarjeta, débito y dinero en cuenta. |
| D11 | Un pago **rechazado** no cancela la orden: queda `pending` hasta vencer. | MP permite reintentar con otro medio dentro de la misma preferencia; cancelar liberaría el cupo en medio del reintento. |
| D12 | **Anular** una entrada no devuelve el lugar al cupo. | Lo más simple y seguro; si quieren revender, suben el cupo en el admin. |
| D13 | El escáner es instalable (manifest) pero **no funciona offline**. | Validar offline exige sincronizar entradas en el celu y resolver doble ingreso entre dispositivos: fuera de un MVP. |
| D14 | Máximo **20 entradas por tipo por compra**. | No es un límite por persona (el brief lo excluye), es un tope técnico para evitar errores de tipeo/abuso del form. Configurable. |
| D15 | Si un pago aprobado llega tarde y ya no hay cupo, la orden queda `needs_refund` y aparece como alerta en el admin (devolución manual en MP). | El brief prohíbe sobreventa y dice que los reembolsos son manuales. |
| D16 | Del lado del servidor se accede a los datos con **conexión directa a Postgres** (`DATABASE_URL`, que Supabase provee) en vez de supabase-js. Las lecturas públicas corren con `set local role anon`, así aplican las mismas políticas RLS que con la anon key. supabase-js se usa solo para Auth y Storage. | Las operaciones críticas (reserva, confirmación, escaneo) ya son funciones SQL; con `pg` se llaman igual en Supabase, en el Postgres embebido y en los tests. Un solo código, sin mocks de base. |
| D17 | En el admin, las fechas se cargan y se muestran en hora argentina fija (UTC−3). | Argentina no tiene horario de verano desde 2009. Evita depender de la zona horaria del navegador. |
| D18 | **Modo local sin Supabase** (para desarrollo y demo): Postgres embebido (`embedded-postgres`), login del admin con `ADMIN_EMAILS` + `SEED_ADMIN_PASSWORD` y cookie firmada con HMAC, y archivos subidos guardados en la tabla `local_files`. Si están las variables de Supabase, se usan Supabase Auth y Storage automáticamente. | No había credenciales de Supabase disponibles; así todo el flujo se puede probar igual, y pasar a Supabase es solo completar variables. |
| D19 | Flyers y fotos se muestran con `<img>` común (sin el optimizador de imágenes de Next). | Evita configurar dominios remotos (Supabase Storage) y permite los SVG de ejemplo. Los flyers subidos se limitan a 5 MB. |
| D20 | Los flyers y fotos del seed son SVG generados (`npm run placeholders`) y viven en `/public/seed`. En modo embebido, `npm run dev` carga el seed solo si la base está vacía. | Sin acceso a bancos de imágenes; y así un `npm run dev` en una máquina nueva ya muestra la web con datos. |
| D21 | El link `/compra/[id]` (UUID imposible de adivinar) funciona como "link privado" de la compra: muestra el estado y las entradas sin pedir login. | No hay cuentas de comprador (fuera de alcance). Es lo mismo que hace el link del mail. |
