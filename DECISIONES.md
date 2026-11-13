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
