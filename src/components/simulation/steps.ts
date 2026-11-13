export interface StepMeta {
  /** Título corto (barra de pasos) */
  short: string;
  title: string;
  /** Qué está mirando */
  what: string;
  /** Qué tiene que tocar */
  todo: string;
  /** Rótulo del marco */
  frame: string;
}

export const CLIENT_STEPS: StepMeta[] = [
  {
    short: "Home",
    title: "Tu cliente entra a la web",
    what: "Es la página principal de Algo Lindo: arriba la marca y abajo los próximos eventos, cada uno con su flyer, fecha, lugar y el precio más barato. Si quedan pocas entradas aparece el cartelito “¡Últimas!”.",
    todo: "Tocá el evento “Noche de Vinilos & Vermú”.",
    frame: "La web, en el celu de tu cliente",
  },
  {
    short: "Entradas",
    title: "Elige tipo de entrada y cantidad",
    what: "Cada evento puede tener varios tipos de entrada (por ejemplo Anticipada y General), cada uno con su precio y su cupo. Cuando quedan pocas se avisa “Quedan X” para generar urgencia.",
    todo: "Sumá un par de entradas con el botón + y tocá “Comprar”.",
    frame: "La web, en el celu de tu cliente",
  },
  {
    short: "Datos",
    title: "Completa sus datos",
    what: "Pedimos solo lo justo: nombre, mail (ahí le llegan las entradas) y DNI. Si algo está mal escrito, le avisamos antes de seguir. No necesita crearse una cuenta.",
    todo: "Podés cambiar los datos si querés. Después tocá “Reservar y pagar”.",
    frame: "La web, en el celu de tu cliente",
  },
  {
    short: "Reserva",
    title: "Le guardamos las entradas 10 minutos",
    what: "Apenas confirma sus datos, el sistema le reserva las entradas por 10 minutos para que pague tranquilo. Si dos personas quieren la última entrada al mismo tiempo, se la queda una sola: nunca se vende más que el cupo. Si no paga a tiempo, se liberan solas.",
    todo: "Mirá la cuenta regresiva y tocá “Pagar con Mercado Pago”.",
    frame: "La web, en el celu de tu cliente",
  },
  {
    short: "Pago",
    title: "Paga en Mercado Pago",
    what: "El pago lo hace Mercado Pago, no nosotras: ustedes reciben la plata en su cuenta de MP. Se puede pagar con débito, crédito (en un pago) o dinero en cuenta. Esta pantalla es una imitación para la demo.",
    todo: "Tocá “Pagar” para simular un pago aprobado.",
    frame: "Mercado Pago (simulado)",
  },
  {
    short: "Mail",
    title: "Le llega el mail con las entradas",
    what: "Cuando Mercado Pago confirma el pago, el sistema crea una entrada por persona, cada una con su QR único, y se las manda por mail al instante. El QR está firmado: no se puede falsificar ni copiar uno inventado.",
    todo: "Bajá para ver el mail completo. Después tocá “Siguiente”.",
    frame: "El mail que recibe tu cliente",
  },
  {
    short: "Entrada",
    title: "La entrada lista para la puerta",
    what: "Desde el mail abre su entrada: QR grande, código corto por si el QR no se lee, evento, tipo de entrada y a nombre de quién está. No hace falta imprimir nada.",
    todo: "¡Listo! Esto es lo que muestra en la puerta el día del evento.",
    frame: "La entrada, en el celu de tu cliente",
  },
];

export const ADMIN_STEPS: StepMeta[] = [
  {
    short: "Ingreso",
    title: "Entran al panel",
    what: "El panel es privado: solo pueden entrar los mails que ustedes definan, con su contraseña. Funciona desde el celu, sin instalar nada.",
    todo: "Tocá “Entrar”.",
    frame: "Panel de Algo Lindo, en su celu",
  },
  {
    short: "Crear",
    title: "Crean un evento nuevo",
    what: "Cargan nombre, fecha, lugar, descripción, flyer y los tipos de entrada con su precio y su cupo. La dirección web del evento se arma sola a partir del nombre.",
    todo: "Completá el formulario (o tocá “Completar con un ejemplo”) y después “Crear evento”.",
    frame: "Panel → Eventos → Nuevo",
  },
  {
    short: "Publicar",
    title: "Lo publican y aparece en la web",
    what: "Un evento puede quedar como borrador mientras lo preparan. Cuando lo publican, aparece al instante en la home para que la gente compre. También lo pueden despublicar.",
    todo: "Si quedó como borrador, tocá “Publicar” y mirá cómo aparece en la web.",
    frame: "Panel → Eventos  ·  y la web",
  },
  {
    short: "Editar",
    title: "Editan un evento",
    what: "Pueden cambiar el cupo o el precio cuando quieran. El sistema no deja bajar el cupo por debajo de lo que ya se vendió, y si cambian el precio solo afecta a las compras nuevas.",
    todo: "Probá subir el cupo de Anticipada (o bajarlo a menos de 73 para ver el aviso) y tocá “Guardar cambios”.",
    frame: "Panel → Eventos → Editar",
  },
  {
    short: "Ventas",
    title: "Miran las ventas",
    what: "Ven todas las compras con su estado, cuánto vendieron y cuánto recaudaron. Pueden filtrar por evento o estado y buscar por nombre, DNI, mail o código de entrada. En “Asistentes” ven la lista entrada por entrada.",
    todo: "Probá buscar “Sofía” o cambiar a la pestaña “Asistentes”.",
    frame: "Panel → Ventas",
  },
  {
    short: "Excel",
    title: "Exportan a Excel",
    what: "Con un botón bajan la lista (con los filtros que tengan puestos) en un archivo que se abre con Excel o Google Sheets. Sirve para la lista de puerta, para contabilidad o para mandar a la productora.",
    todo: "Tocá “Exportar a Excel”: se descarga un archivo de prueba de verdad.",
    frame: "Panel → Ventas",
  },
  {
    short: "Titular",
    title: "Cambian el titular o anulan una entrada",
    what: "Si alguien le pasa su entrada a otra persona, cambian el nombre desde acá. Si hay que devolver una compra, anulan la entrada (el QR deja de servir) y la plata se devuelve desde Mercado Pago.",
    todo: "Tocá “Cambiar titular” en la entrada de Sofía, escribí otro nombre y guardá. Después probá “Anular” en la otra.",
    frame: "Panel → Ventas → Orden",
  },
  {
    short: "Consultas",
    title: "Les llega una consulta",
    what: "Los mensajes del formulario de contacto (cumpleaños, eventos privados, etc.) quedan acá, con la fecha estimada y botones para responder por mail o WhatsApp.",
    todo: "Leé la consulta del cumple de 30 y marcala como leída.",
    frame: "Panel → Consultas",
  },
  {
    short: "Puerta",
    title: "El día del evento: escanean en la puerta",
    what: "Con el celu abren el escáner y apuntan al QR. Verde: pasa. Amarillo: esa entrada ya se usó (y a qué hora). Rojo: inválida o anulada. Si el QR no se lee, tipean el código corto.",
    todo: "Probá los tres botones de abajo para ver cada resultado. Escaneá la de Sofía dos veces.",
    frame: "Escáner de puerta",
  },
];
