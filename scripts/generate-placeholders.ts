/**
 * Genera los flyers y fotos placeholder de public/seed (SVG).
 * La tipografía va embebida en cada flyer porque un SVG usado como <img> no ve las fuentes de la página.
 * Uso: npx tsx scripts/generate-placeholders.ts
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const fontB64 = fs
  .readFileSync(path.join(root, "node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wdth-normal.woff2"))
  .toString("base64");

const W = 1080;
const H = 1350;

const fontStyle = `<style>@font-face{font-family:'B';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:200 800;font-stretch:75% 100%}
text{font-family:'B',Impact,'Arial Black',sans-serif;font-weight:800}
.c{font-stretch:75%}</style>`;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function grain(id: string) {
  return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0"/></filter>`;
}

function sparkle(cx: number, cy: number, r: number, fill: string) {
  const k = r * 0.18;
  return `<path fill="${fill}" d="M${cx} ${cy - r} L${cx + k} ${cy - k} L${cx + r} ${cy} L${cx + k} ${cy + k} L${cx} ${cy + r} L${cx - k} ${cy + k} L${cx - r} ${cy} L${cx - k} ${cy - k}Z"/>`;
}

function flyerVinilos() {
  const rings = Array.from({ length: 22 }, (_, i) => `<circle cx="760" cy="420" r="${380 - i * 12}" fill="none" stroke="#ffffff" stroke-opacity="${i % 3 === 0 ? 0.12 : 0.05}" stroke-width="2"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${fontStyle}${grain("g")}
<radialGradient id="bg" cx="70%" cy="25%" r="90%"><stop offset="0" stop-color="#3b1d6e"/><stop offset=".55" stop-color="#170c2b"/><stop offset="1" stop-color="#0b0712"/></radialGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="760" cy="420" r="390" fill="#0a0a0c"/>${rings}
<circle cx="760" cy="420" r="390" fill="url(#shine)"/>
<circle cx="760" cy="420" r="120" fill="#ff3d7f"/><circle cx="760" cy="420" r="14" fill="#0a0a0c"/>
<text x="760" y="395" text-anchor="middle" font-size="30" fill="#1a0510" class="c" letter-spacing="3">ALGO LINDO</text>
<text x="760" y="465" text-anchor="middle" font-size="26" fill="#1a0510" class="c" letter-spacing="2">LADO A</text>
<text x="70" y="110" font-size="34" fill="#d4ff3a" letter-spacing="6">ALGO LINDO PRESENTA</text>
<text x="70" y="900" font-size="96" fill="#f8f2ea" class="c">NOCHE DE</text>
<text x="62" y="1080" font-size="230" fill="#f8f2ea" class="c" letter-spacing="-4">VINILOS</text>
<text x="70" y="1190" font-size="120" fill="#d4ff3a" class="c">&amp; VERMÚ</text>
<text x="70" y="1280" font-size="34" fill="#f8f2ea" fill-opacity=".75" letter-spacing="4">DJS EN VINILO · VERMÚ DE AUTOR · EDICIÓN Nº 7</text>
${sparkle(980, 1180, 46, "#ff3d7f")}
<rect width="${W}" height="${H}" filter="url(#g)"/>
</svg>`;
}

function flyerCumbia() {
  const stripes = Array.from({ length: 7 }, (_, i) => `<rect x="190" y="${470 + i * 34}" width="700" height="${10 + i * 2}" fill="#ff3d7f"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${fontStyle}${grain("g")}
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3d7f"/><stop offset=".45" stop-color="#ff7a45"/><stop offset="1" stop-color="#ffc53d"/></linearGradient>
<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ffd23d"/></linearGradient>
<clipPath id="sc"><circle cx="540" cy="560" r="330"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g clip-path="url(#sc)"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#sun)"/>${stripes}</g>
<path d="M0 820 L120 760 L120 700 L210 700 L210 760 L330 740 L330 640 L420 640 L420 720 L560 700 L560 600 L640 600 L640 690 L780 720 L780 660 L880 660 L880 740 L1080 780 L1080 ${H} L0 ${H}Z" fill="#2a0b2c"/>
<text x="540" y="120" text-anchor="middle" font-size="34" fill="#2a0b2c" letter-spacing="6">ALGO LINDO PRESENTA</text>
<text x="540" y="1010" text-anchor="middle" font-size="250" fill="#ffd23d" class="c" letter-spacing="-4">CUMBIA</text>
<text x="540" y="1130" text-anchor="middle" font-size="104" fill="#f8f2ea" class="c">EN LA TERRAZA</text>
<text x="540" y="1250" text-anchor="middle" font-size="34" fill="#f8f2ea" fill-opacity=".8" letter-spacing="4">ATARDECER · BANDA EN VIVO · DJ HASTA EL CIERRE</text>
${sparkle(130, 300, 40, "#f8f2ea")}${sparkle(960, 230, 28, "#f8f2ea")}
<rect width="${W}" height="${H}" filter="url(#g)"/>
</svg>`;
}

function flyerPrimavera() {
  const r = rng(7);
  const flowers = Array.from({ length: 14 }, () => {
    const cx = r() * W;
    const cy = 120 + r() * 700;
    const s = 30 + r() * 70;
    const color = ["#ff3d7f", "#8b6cff", "#ffc53d", "#f8f2ea"][Math.floor(r() * 4)];
    const petals = Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * Math.PI * 2;
      return `<ellipse cx="${cx + Math.cos(a) * s * 0.6}" cy="${cy + Math.sin(a) * s * 0.6}" rx="${s * 0.45}" ry="${s * 0.3}" transform="rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * s * 0.6} ${cy + Math.sin(a) * s * 0.6})" fill="${color}"/>`;
    }).join("");
    return `${petals}<circle cx="${cx}" cy="${cy}" r="${s * 0.3}" fill="#141a04"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${fontStyle}${grain("g")}</defs>
<rect width="${W}" height="${H}" fill="#d4ff3a"/>${flowers}
<rect x="0" y="860" width="${W}" height="${H - 860}" fill="#141a04"/>
<text x="70" y="1020" font-size="150" fill="#d4ff3a" class="c">FIESTA DE</text>
<text x="62" y="1190" font-size="190" fill="#f8f2ea" class="c" letter-spacing="-3">PRIMAVERA</text>
<text x="70" y="1275" font-size="34" fill="#d4ff3a" letter-spacing="4">ALGO LINDO · OPEN AIR · DJS INVITADOS</text>
<rect width="${W}" height="${H}" filter="url(#g)"/>
</svg>`;
}

/** "Foto" de fiesta: luces bokeh + siluetas de público. */
function partyPhoto(seed: number, palette: string[], w = 1200, h = 1200) {
  const r = rng(seed);
  const bokeh = Array.from({ length: 46 }, () => {
    const c = palette[Math.floor(r() * palette.length)];
    return `<circle cx="${r() * w}" cy="${r() * h * 0.75}" r="${12 + r() * 70}" fill="${c}" opacity="${0.25 + r() * 0.5}"/>`;
  }).join("");
  const beams = Array.from({ length: 5 }, (_, i) => {
    const x = (i + 0.5) * (w / 5) + (r() - 0.5) * 120;
    const c = palette[i % palette.length];
    return `<path d="M${x} -20 L${x - 160 - r() * 120} ${h} L${x + 160 + r() * 120} ${h}Z" fill="${c}" opacity=".13"/>`;
  }).join("");
  const crowd: string[] = [];
  for (let row = 0; row < 3; row++) {
    const baseY = h * (0.72 + row * 0.1);
    const shade = ["#120a16", "#0c070f", "#060407"][row];
    for (let x = -40; x < w + 60; x += 70 + r() * 50) {
      const hr = 34 + r() * 14 + row * 8;
      const y = baseY + (r() - 0.5) * 30;
      crowd.push(`<circle cx="${x}" cy="${y}" r="${hr}" fill="${shade}"/>`);
      crowd.push(`<rect x="${x - hr * 1.5}" y="${y + hr * 0.8}" width="${hr * 3}" height="${h}" rx="${hr}" fill="${shade}"/>`);
      if (r() < 0.28) {
        const dir = r() < 0.5 ? -1 : 1;
        crowd.push(`<path d="M${x + dir * hr * 0.6} ${y + hr} Q ${x + dir * hr * 1.4} ${y - hr} ${x + dir * hr * 1.1} ${y - hr * 2.6}" stroke="${shade}" stroke-width="${hr * 0.55}" stroke-linecap="round" fill="none"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><filter id="b"><feGaussianBlur stdDeviation="14"/></filter><filter id="b2"><feGaussianBlur stdDeviation="2"/></filter>${grain("g")}
<radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${palette[0]}" stop-opacity=".55"/><stop offset="1" stop-color="#07050a"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="#07050a"/><rect width="${w}" height="${h}" fill="url(#bg)"/>
<g filter="url(#b)">${beams}${bokeh}</g>
<g filter="url(#b2)">${crowd.join("")}</g>
<rect width="${w}" height="${h}" filter="url(#g)"/>
</svg>`;
}

function write(rel: string, content: string) {
  const file = path.join(root, "public", rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`  ✓ public/${rel} (${Math.round(content.length / 1024)} KB)`);
}

write("seed/flyers/noche-de-vinilos.svg", flyerVinilos());
write("seed/flyers/cumbia-en-la-terraza.svg", flyerCumbia());
write("seed/flyers/fiesta-de-primavera.svg", flyerPrimavera());

const palettes = [
  ["#ff3d7f", "#8b6cff", "#ffc53d"],
  ["#8b6cff", "#3dd6ff", "#ff3d7f"],
  ["#ffc53d", "#ff7a45", "#ff3d7f"],
  ["#d4ff3a", "#2fe39a", "#8b6cff"],
  ["#ff3d7f", "#ff7a45", "#f8f2ea"],
  ["#3dd6ff", "#8b6cff", "#d4ff3a"],
];
palettes.forEach((p, i) => write(`seed/galeria/foto-${i + 1}.svg`, partyPhoto(100 + i * 17, p)));
