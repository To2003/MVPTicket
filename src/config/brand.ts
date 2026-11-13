/**
 * Identidad de marca: TODO lo que hay que tocar para reskinear (junto con
 * src/styles/theme.css para colores y tipografías).
 */
export const brand = {
  name: "Algo Lindo",
  /** Si hay logo de la clienta, poné el archivo en /public/brand y la ruta acá. Si es null se usa el wordmark. */
  logoSrc: null as string | null,
  tagline: "Fiestas, ciclos y eventos que dan ganas de volver.",
  heroTitle: ["Noches", "que quedan", "lindas."],
  heroSubtitle:
    "Armamos fiestas con buena música, gente linda y cero vueltas. Sacá tu entrada en dos minutos desde el celu.",
  city: "Buenos Aires",
  contact: {
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491155550000",
    whatsappMessage: "¡Hola Algo Lindo! Quiero consultar por un evento 🎉",
    email: "hola@algolindo.test",
    instagram: "algolindo.eventos",
  },
  about: {
    title: "Somos Algo Lindo",
    lead: "Un emprendimiento de dos amigas que se cansaron de las fiestas aburridas.",
    paragraphs: [
      "Arrancamos en 2022 organizando cumpleaños de amigas en terrazas prestadas. Hoy hacemos ciclos mensuales, fiestas temáticas y eventos privados para quienes quieren algo distinto.",
      "Nos importa que la pases bien desde que sacás la entrada hasta que volvés a tu casa: lugares cuidados, música elegida con amor, barra que no te hace esperar y un equipo que te recibe con una sonrisa.",
      "¿Tenés un cumpleaños, un aniversario o un evento de empresa? Escribinos y lo armamos juntas.",
    ],
    stats: [
      { value: "+40", label: "eventos hechos" },
      { value: "+6.000", label: "personas bailando" },
      { value: "4", label: "ciclos por año" },
    ],
  },
  /** Umbral para mostrar "quedan X" (D6). */
  lowStockThreshold: 20,
  /** Tope técnico por tipo de entrada en una compra (D14). */
  maxPerType: 20,
  /** Minutos de reserva de cupo. */
  reservationMinutes: 10,
} as const;

export function whatsappLink(message: string = brand.contact.whatsappMessage): string {
  return `https://wa.me/${brand.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}
