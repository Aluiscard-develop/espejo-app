// Colorimetría personal: piel, pelo y ojos (en CIELAB) + un test corto → 3 ejes (calidez, profundidad,
// claridad) → 12 estaciones con su paleta, joyería, metales y maquillaje. También juzga si una prenda te favorece.
// Sin modelos ni red. Es el método de los asesores de imagen: orientativo, no ciencia exacta (D-13).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).color = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clamp = (v, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

  // ---- conversión de color (sRGB D65) ----
  const toLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const fromLinear = (c) => Math.round(255 * clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055, 0, 1));

  function rgbToLab([r, g, b]) {
    const R = toLinear(r), G = toLinear(g), B = toLinear(b);
    const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
    const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
    const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function labToRgb([L, a, b]) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
    const X = inv(fx) * 0.95047, Y = inv(fy), Z = inv(fz) * 1.08883;
    return [
      fromLinear(3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z),
      fromLinear(-0.969266 * X + 1.8760108 * Y + 0.041556 * Z),
      fromLinear(0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z),
    ];
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const hexToLab = (hex) => rgbToLab(hexToRgb(hex));
  const chroma = ([, a, b]) => Math.hypot(a, b);
  const hue = ([, a, b]) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;

  // CIEDE2000 (Sharma, Wu y Dalal, 2005).
  function deltaE([L1, a1, b1], [L2, a2, b2]) {
    const rad = Math.PI / 180;
    const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
    const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2;
    const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
    const hp = (a, b) => (a === 0 && b === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
    const hp1 = hp(ap1, b1), hp2 = hp(ap2, b2);
    const dL = L2 - L1, dC = Cp2 - Cp1;
    let dh = 0;
    if (Cp1 * Cp2 !== 0) { dh = hp2 - hp1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
    const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
    const Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
    let hm = hp1 + hp2;
    if (Cp1 * Cp2 !== 0) hm = Math.abs(hp1 - hp2) <= 180 ? hm / 2 : (hm + (hm < 360 ? 360 : -360)) / 2;
    const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
    const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
    const RC = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
    const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
    const RT = -Math.sin(2 * dTheta * rad) * RC;
    return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
  }

  // ---- muestreo sobre la foto (RGBA) ----
  const median = (arr) => { const s = Float64Array.from(arr).sort(); return s.length ? s[s.length >> 1] : NaN; };

  /** Mediana RGB de un círculo; `accept(r,g,b)` filtra (p. ej. solo piel). null si no hay píxeles. */
  function sampleCircle(data, w, h, cx, cy, r, accept) {
    const R = [], G = [], B = [];
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = 4 * (y * w + x), rr = data[i], gg = data[i + 1], bb = data[i + 2];
      if (accept && !accept(rr, gg, bb)) continue;
      R.push(rr); G.push(gg); B.push(bb);
    }
    return R.length ? [median(R), median(G), median(B)] : null;
  }

  /** Ganancias de balance de blancos (von Kries en RGB lineal) para que `rgb` se vuelva gris neutro. */
  function whiteBalance(rgb) {
    const lin = rgb.map(toLinear);
    const m = (lin[0] + lin[1] + lin[2]) / 3;
    return lin.map((c) => (c > 0.001 ? m / c : 1));
  }
  const applyGains = (rgb, gains) => (gains ? rgb.map((c, i) => fromLinear(toLinear(c) * gains[i])) : rgb.slice());

  // ---- test ----
  // Cada respuesta suma a uno o varios ejes: w = calidez (+cálido), d = profundidad (+oscuro), c = claridad (+intenso).
  const QUIZ = [
    { id: "venas", q: "Mira las venas de tu muñeca con luz de día. ¿De qué color se ven?", options: [
      { v: "verde", label: "Verdosas", fx: { w: 1 } },
      { v: "azul", label: "Azules o moradas", fx: { w: -1 } },
      { v: "mezcla", label: "Las dos / no lo tengo claro", fx: { w: 0 } }] },
    { id: "metal", q: "Si te pones algo dorado y algo plateado junto a la cara, ¿qué te ilumina más?", options: [
      { v: "oro", label: "Lo dorado", fx: { w: 1 } },
      { v: "plata", label: "Lo plateado", fx: { w: -1 } },
      { v: "ambos", label: "Me dan igual los dos", fx: { w: 0 } }] },
    { id: "blanco", q: "¿Qué camiseta te queda mejor?", options: [
      { v: "puro", label: "Blanco puro, brillante", fx: { w: -0.6, c: 0.6 } },
      { v: "crudo", label: "Blanco roto, crudo o marfil", fx: { w: 0.6, c: -0.3 } },
      { v: "nose", label: "No sé", fx: {} }] },
    { id: "sol", q: "¿Qué te pasa con el sol sin protector?", options: [
      { v: "dorado", label: "Me pongo moreno/dorado fácil", fx: { w: 0.5, d: 0.3 } },
      { v: "rojo-moreno", label: "Me quemo un poco y luego me bronceo", fx: { w: 0 } },
      { v: "rojo", label: "Me quemo, casi no me bronceo", fx: { w: -0.5, d: -0.4 } }] },
    { id: "piel", q: "Tu tono de piel (sin bronceado):", options: [
      { v: "muy-clara", label: "Muy clara", fx: { d: -1 } },
      { v: "clara", label: "Clara", fx: { d: -0.5 } },
      { v: "media", label: "Media / trigueña", fx: { d: 0.1 } },
      { v: "morena", label: "Morena", fx: { d: 0.6 } },
      { v: "oscura", label: "Oscura", fx: { d: 1 } }] },
    { id: "pelo", q: "Tu color de pelo natural (o el que tenías de joven si ya tienes canas):", options: [
      { v: "negro", label: "Negro", fx: { d: 1, c: 0.3 } },
      { v: "castano-oscuro", label: "Castaño oscuro", fx: { d: 0.6 } },
      { v: "castano", label: "Castaño medio", fx: { d: 0.1, c: -0.3 } },
      { v: "castano-claro", label: "Castaño claro / rubio oscuro", fx: { d: -0.4, c: -0.5 } },
      { v: "rubio", label: "Rubio", fx: { d: -0.9 } },
      { v: "pelirrojo", label: "Pelirrojo o cobrizo", fx: { w: 1, d: -0.1 } }] },
    { id: "ojos", q: "Tus ojos se ven…", options: [
      { v: "intensos", label: "Intensos, con mucho contraste con el blanco del ojo", fx: { c: 1 } },
      { v: "normales", label: "Normales", fx: { c: 0 } },
      { v: "suaves", label: "Suaves, difuminados, grisáceos o color avellana apagado", fx: { c: -1 } }] },
  ];

  function quizAxes(answers = {}) {
    const sum = { w: 0, d: 0, c: 0 }, n = { w: 0, d: 0, c: 0 };
    for (const q of QUIZ) {
      const opt = q.options.find((o) => o.v === answers[q.id]);
      if (!opt) continue;
      for (const [k, v] of Object.entries(opt.fx)) { sum[k] += v; n[k]++; }
    }
    const out = {};
    for (const k of ["w", "d", "c"]) out[k] = n[k] ? sum[k] / n[k] : null;
    return out;
  }

  /**
   * Ejes a partir de lo medido en la foto (Lab ya con balance de blancos). Cualquiera puede faltar.
   * Calidez: ángulo de tono de la piel (más amarillo = más cálido). Profundidad: L* de piel y pelo.
   * Claridad: contraste piel-pelo y viveza del iris.
   */
  function photoAxes({ skin, hair, eyes } = {}) {
    const out = { w: null, d: null, c: null };
    if (skin) out.w = clamp((hue(skin) - 59) / 11);
    if (skin && hair) out.d = clamp(0.4 * ((60 - skin[0]) / 18) + 0.6 * ((38 - hair[0]) / 20));
    else if (skin) out.d = clamp((60 - skin[0]) / 18);
    else if (hair) out.d = clamp((38 - hair[0]) / 20);
    const contrast = skin && (hair || eyes) ? Math.abs(skin[0] - (hair || eyes)[0]) : null;
    if (contrast !== null) {
      const c = (contrast - 28) / 16;
      out.c = clamp(eyes ? 0.7 * c + 0.3 * ((chroma(eyes) - 14) / 12) : c);
    }
    return { ...out, contrast };
  }

  /** Mezcla foto (40 %) y test (60 %); la luz de la foto engaña más que las respuestas. */
  function combineAxes(photo, quiz) {
    const out = {};
    for (const k of ["w", "d", "c"]) {
      const p = photo ? photo[k] : null, q = quiz ? quiz[k] : null;
      out[k] = p !== null && q !== null ? 0.4 * p + 0.6 * q : p ?? q ?? 0;
    }
    return out;
  }

  // ---- las 12 estaciones ----
  // proto = posición típica en (calidez, profundidad, claridad).
  const SEASONS = {
    "primavera-clara": { name: "Primavera clara", family: "primavera", proto: { w: 0.4, d: -0.8, c: 0.3 },
      desc: "Colores claros, cálidos y luminosos, como pasteles con un toque dorado.",
      best: ["#F7E07A", "#FFC69A", "#FF9E80", "#F88379", "#F9B7C3", "#A8E6A1", "#7FD8BE", "#7FD8D8", "#87CEEB", "#9DB4F0", "#C3A6E0", "#40B5AD"],
      neutrals: ["#FFF8E7", "#EAD7B5", "#C8A27A", "#BDB6A8", "#7D8CAF", "#8B6B4A"],
      avoid: ["#000000", "#36454F", "#800020", "#3B2416", "#4B5320", "#2E1A47"] },
    "primavera-calida": { name: "Primavera cálida", family: "primavera", proto: { w: 0.9, d: -0.2, c: 0.4 },
      desc: "Colores cálidos, vivos y alegres: dorados, corales, verdes hierba.",
      best: ["#FFD23F", "#FFA62B", "#FF7F50", "#F2545B", "#E8A87C", "#C5E063", "#4CBB17", "#3EB489", "#1AB2B6", "#4F86C6", "#E6B655", "#B5651D"],
      neutrals: ["#FFF5E1", "#E3C9A1", "#C19A6B", "#A67B5B", "#7A5C3E", "#2E4A62"],
      avoid: ["#000000", "#E6E6FA", "#C0C0C0", "#FF00FF", "#4B0082", "#708090"] },
    "primavera-brillante": { name: "Primavera brillante", family: "primavera", proto: { w: 0.4, d: -0.1, c: 0.9 },
      desc: "Colores intensos, limpios y cálidos-neutros, con mucho contraste.",
      best: ["#FFE135", "#FF8C00", "#FF4F5E", "#FF3E96", "#E0115F", "#00C853", "#00BFA5", "#00B7EB", "#1E90FF", "#5B5FEF", "#9B59D0", "#FFB347"],
      neutrals: ["#FFFDF4", "#D7C4A3", "#8C6A4F", "#1F3A5F", "#3B3B3B", "#B0A99F"],
      avoid: ["#B5A69A", "#C3B091", "#8E8268", "#9A8B7A", "#A9A9A9", "#6B4E3D"] },
    "verano-claro": { name: "Verano claro", family: "verano", proto: { w: -0.4, d: -0.8, c: -0.2 },
      desc: "Colores claros, fríos y suaves: pasteles empolvados, azules y rosas delicados.",
      best: ["#F4C2C2", "#E8A5B8", "#D8A7D6", "#B39EDB", "#A7C7E7", "#89CFF0", "#9BD3D0", "#A8D5BA", "#E6E6FA", "#C8A2C8", "#7FA6C9", "#F7CAC9"],
      neutrals: ["#FAFAF7", "#D9D6CF", "#A9A9B0", "#8A95A5", "#5B6E8C", "#9C8E8A"],
      avoid: ["#000000", "#FF8C00", "#8B4513", "#556B2F", "#FFD700", "#B22222"] },
    "verano-frio": { name: "Verano frío", family: "verano", proto: { w: -0.9, d: -0.1, c: -0.3 },
      desc: "Colores fríos y medios, con base azul: frambuesa, azul acero, lavanda.",
      best: ["#C71585", "#DE5D83", "#E75480", "#B784A7", "#8E7CC3", "#6A5ACD", "#4682B4", "#5F9EA0", "#2E8B87", "#6495ED", "#B0C4DE", "#AF4D73"],
      neutrals: ["#F5F5F5", "#C0C0C8", "#8C92AC", "#5D6D7E", "#34495E", "#7B6D74"],
      avoid: ["#FF8C00", "#DAA520", "#8B4513", "#808000", "#FF7F50", "#F5DEB3"] },
    "verano-suave": { name: "Verano suave", family: "verano", proto: { w: -0.35, d: -0.1, c: -0.8 },
      desc: "Colores apagados, empolvados y frescos: rosa palo, salvia, azul grisáceo.",
      best: ["#C08081", "#D4A5A5", "#B48A9C", "#9E7BB5", "#8FA3BF", "#7393B3", "#8FBC8F", "#9CAF88", "#7FA7A2", "#A3B5C6", "#B09FCA", "#8E6F7E"],
      neutrals: ["#F0EDE8", "#C9C4BC", "#9E9A95", "#6E7B8B", "#4D5B6A", "#8B7D7B"],
      avoid: ["#000000", "#FFFFFF", "#FF4500", "#FFD700", "#00FF7F", "#FF1493"] },
    "otono-suave": { name: "Otoño suave", family: "otono", proto: { w: 0.35, d: 0.05, c: -0.8 },
      desc: "Colores cálidos y apagados: camel, salvia, terracota suave, melocotón tostado.",
      best: ["#C8A27A", "#D2A679", "#C97C5D", "#B5735A", "#D8A48F", "#A3A380", "#8A9A5B", "#7BA092", "#6B8E8E", "#5F7A8A", "#9C8AA5", "#BFA05A"],
      neutrals: ["#F3E9DC", "#D6C3A5", "#A68A6D", "#7E6B5A", "#5D5348", "#6F7470"],
      avoid: ["#000000", "#FFFFFF", "#FF00FF", "#0000FF", "#FF1493", "#00FFFF"] },
    "otono-calido": { name: "Otoño cálido", family: "otono", proto: { w: 0.9, d: 0.3, c: -0.3 },
      desc: "Colores cálidos y terrosos: mostaza, óxido, oliva, calabaza, verde musgo.",
      best: ["#E1AD01", "#CC7722", "#D2691E", "#B7410E", "#A0522D", "#8B5A2B", "#808000", "#6B8E23", "#556B2F", "#2F6F6F", "#C19A6B", "#E07B39"],
      neutrals: ["#F5EBDD", "#D2B48C", "#A0785A", "#6F4E37", "#4E3B31", "#3D4B3A"],
      avoid: ["#000000", "#FF69B4", "#E6E6FA", "#C0C0C0", "#4169E1", "#FF00FF"] },
    "otono-profundo": { name: "Otoño profundo", family: "otono", proto: { w: 0.4, d: 0.85, c: -0.1 },
      desc: "Colores oscuros, cálidos y ricos: chocolate, burdeos tostado, verde bosque, petróleo.",
      best: ["#7B3F00", "#8B0000", "#9B2D20", "#B7410E", "#C68E17", "#DAA520", "#556B2F", "#355E3B", "#014D4E", "#2F4F4F", "#5B3A29", "#6D214F"],
      neutrals: ["#EFE6D8", "#C8AD8D", "#8B6F4E", "#4B3621", "#3B3024", "#1C2A2A"],
      avoid: ["#FFB6C1", "#E6E6FA", "#ADD8E6", "#C0C0C0", "#FFFFFF", "#87CEFA"] },
    "invierno-profundo": { name: "Invierno profundo", family: "invierno", proto: { w: -0.4, d: 0.85, c: 0.3 },
      desc: "Colores oscuros, fríos-neutros e intensos: negro, vino, esmeralda, azul noche.",
      best: ["#800020", "#9B111E", "#C41E3A", "#722F37", "#50C878", "#046307", "#008080", "#0F52BA", "#191970", "#4B0082", "#6C3082", "#E0E0E0"],
      neutrals: ["#FFFFFF", "#D3D3D3", "#555555", "#2F2F2F", "#000000", "#1B263B"],
      avoid: ["#F5DEB3", "#FFDAB9", "#D2B48C", "#C3B091", "#FFA07A", "#BDB76B"] },
    "invierno-frio": { name: "Invierno frío", family: "invierno", proto: { w: -0.9, d: 0.3, c: 0.4 },
      desc: "Colores fríos, puros y nítidos: blanco óptico, azul real, fucsia, verde pino.",
      best: ["#FF007F", "#DC143C", "#C71585", "#8A2BE2", "#4169E1", "#0047AB", "#00A3E0", "#008B8B", "#01796F", "#E0B0FF", "#B0E0E6", "#F0F8FF"],
      neutrals: ["#FFFFFF", "#C0C0C0", "#708090", "#36454F", "#000000", "#000080"],
      avoid: ["#FFA500", "#DAA520", "#D2B48C", "#8B4513", "#808000", "#F4A460"] },
    "invierno-brillante": { name: "Invierno brillante", family: "invierno", proto: { w: -0.4, d: 0.1, c: 0.9 },
      desc: "Colores muy intensos y contrastados, fríos-neutros: rojo puro, cobalto, verde esmeralda.",
      best: ["#FF0000", "#FF1493", "#FF00FF", "#9400D3", "#0000FF", "#0047AB", "#00BFFF", "#00CED1", "#00A86B", "#32CD32", "#FFFF33", "#F8F8FF"],
      neutrals: ["#FFFFFF", "#DCDCDC", "#696969", "#2B2B2B", "#000000", "#0A1F44"],
      avoid: ["#C3B091", "#BC987E", "#A0522D", "#8F9779", "#D8BFD8", "#CDB79E"] },
  };

  // Joyería y metales por familia; el acabado y el tamaño dependen de claridad y contraste.
  const METALS = {
    primavera: { main: "Oro amarillo claro", also: ["Oro rosa", "Latón pulido"], avoid: "Plata oscurecida, metales muy fríos", swatch: ["#E6C35C", "#E8B4A0"] },
    otono: { main: "Oro amarillo, bronce y cobre", also: ["Oro envejecido", "Madera, cuero"], avoid: "Plata brillante y cromo", swatch: ["#C9A227", "#B87333"] },
    verano: { main: "Plata y oro blanco", also: ["Platino", "Oro rosa suave"], avoid: "Oro amarillo intenso", swatch: ["#C0C0C0", "#E5E4E2"] },
    invierno: { main: "Plata, platino y acero", also: ["Oro blanco", "Titanio negro"], avoid: "Oro envejecido, cobre", swatch: ["#D9D9D9", "#3A3A3A"] },
  };

  function jewelry(seasonId, axes, contrast) {
    const s = SEASONS[seasonId], m = METALS[s.family];
    const neutral = Math.abs(axes.w) < 0.15;
    const finish = axes.c > 0.3 ? "Pulido y brillante" : axes.c < -0.3 ? "Mate, satinado o cepillado" : "Satinado o pulido suave";
    const size = (contrast ?? 30) > 40 || axes.c > 0.5 ? "Piezas con presencia (reloj grande, cadena marcada)" : (contrast ?? 30) < 22 || axes.c < -0.5 ? "Piezas finas y discretas" : "Tamaño medio";
    const frames = { primavera: ["Carey claro", "Dorado", "Miel"], otono: ["Carey oscuro", "Marrón", "Oliva", "Bronce"], verano: ["Gris", "Azul pizarra", "Transparente", "Plateado"], invierno: ["Negro", "Plateado", "Azul marino", "Transparente"] }[s.family];
    return {
      main: neutral ? "Te van los dos: oro y plata (oro rosa es la apuesta segura)" : m.main,
      also: m.also, avoid: neutral ? null : m.avoid, swatch: neutral ? ["#E6C35C", "#C0C0C0", "#E8B4A0"] : m.swatch,
      finish, size, frames,
    };
  }

  // Maquillaje por familia (mismo criterio que la paleta: subtono y profundidad), como [nombre, hex].
  const MAKEUP = {
    primavera: { lips: [["Coral", "#F2766B"], ["Melocotón", "#F59A83"], ["Rojo amapola", "#E2493B"]],
      blush: [["Melocotón", "#F4A582"], ["Albaricoque", "#F7B39B"]], eyes: [["Dorado", "#C9A66B"], ["Marrón cálido", "#8B6F47"], ["Verde salvia", "#8FA876"]],
      avoid: "Labiales fríos y oscuros (ciruela, burdeos azulado) y sombras grises" },
    otono: { lips: [["Terracota", "#B5523B"], ["Ladrillo", "#A0442C"], ["Rojo óxido", "#8E3B2F"]],
      blush: [["Terracota", "#C97B5A"], ["Bronce", "#D89070"]], eyes: [["Bronce", "#8B5A2B"], ["Chocolate", "#6B4E2E"], ["Oliva", "#5D6B3A"]],
      avoid: "Rosas fríos, fucsias y sombras plateadas" },
    verano: { lips: [["Rosa frambuesa suave", "#C46B8A"], ["Rosa palo", "#D28BA0"], ["Malva", "#9E4F6E"]],
      blush: [["Rosa frío", "#E8A0B4"], ["Malva", "#D59AB0"]], eyes: [["Gris lavanda", "#8E8FA6"], ["Malva", "#7B6B8D"], ["Pizarra", "#6A7B8C"]],
      avoid: "Naranjas, corales y dorados intensos" },
    invierno: { lips: [["Rojo frío", "#C8102E"], ["Fucsia", "#B0005A"], ["Burdeos", "#6D1A36"]],
      blush: [["Frambuesa", "#D9508C"], ["Baya", "#C2507A"]], eyes: [["Carbón", "#3A3A4A"], ["Berenjena", "#5A4A7A"], ["Plata", "#9AA0A8"]],
      avoid: "Melocotones, corales y marrones cálidos" },
  };

  /** Maquillaje de la estación; la intensidad del acabado sale del eje de claridad. */
  function makeup(seasonId, axes = { c: 0 }) {
    const m = MAKEUP[SEASONS[seasonId].family];
    const finish = axes.c > 0.3 ? "Te van los labios intensos y los acabados con brillo." : axes.c < -0.3 ? "Mejor tonos difuminados y acabados satinados o mate; los colores muy vivos te endurecen." : "Tonos medios; reserva el labio intenso para la noche.";
    return { ...m, finish };
  }

  const SPREAD = 0.45;

  /** Estaciones ordenadas de más a menos parecida con porcentaje (suma 100). */
  function classify(axes) {
    const scored = Object.entries(SEASONS).map(([id, s]) => {
      const d2 = (axes.w - s.proto.w) ** 2 + (axes.d - s.proto.d) ** 2 + (axes.c - s.proto.c) ** 2;
      return { id, name: s.name, score: Math.exp(-d2 / (2 * SPREAD * SPREAD)) };
    });
    const total = scored.reduce((a, s) => a + s.score, 0);
    for (const s of scored) s.pct = total > 0 ? (100 * s.score) / total : 100 / scored.length;
    return scored.sort((a, b) => b.score - a.score);
  }

  const word = (v, neg, mid, pos) => (v > 0.25 ? pos : v < -0.25 ? neg : mid);

  /**
   * Análisis completo.
   * @param {{skin?:number[], hair?:number[], eyes?:number[]}} lab  medidas en Lab (ya balanceadas)
   * @param {object} answers  respuestas del test {id: v}
   * @param {string} [forced] id de estación elegida a mano
   */
  function analyze(lab, answers, forced) {
    const photo = photoAxes(lab);
    const quiz = quizAxes(answers);
    const axes = combineAxes(photo, quiz);
    const ranking = classify(axes);
    const id = forced && SEASONS[forced] ? forced : ranking[0].id;
    const s = SEASONS[id];
    return {
      axes, photo, quiz, ranking: ranking.slice(0, 3).map(({ id, name, pct }) => ({ id, name, pct })),
      season: { id, name: s.name, family: s.family, desc: s.desc, best: s.best, neutrals: s.neutrals, avoid: s.avoid },
      traits: {
        undertone: word(axes.w, "Frío", "Neutro", "Cálido"),
        depth: word(axes.d, "Claro", "Medio", "Profundo"),
        clarity: word(axes.c, "Suave", "Medio", "Intenso"),
        contrast: photo.contrast === null ? null : photo.contrast > 40 ? "Alto" : photo.contrast < 22 ? "Bajo" : "Medio",
      },
      jewelry: jewelry(id, axes, photo.contrast),
    };
  }

  /**
   * ¿Esta prenda te favorece? Compara con la paleta (ΔE2000) y con los rasgos de tu estación.
   * @returns {{verdict:"si"|"medio"|"no", reasons:string[], match:string, alternatives:string[], dBest:number}}
   */
  function judge(rgb, seasonId) {
    const s = SEASONS[seasonId];
    const lab = rgbToLab(rgb);
    const near = (list) => list.map((hex) => ({ hex, d: deltaE(lab, hexToLab(hex)) })).sort((a, b) => a.d - b.d);
    const good = near([...s.best, ...s.neutrals]), bad = near(s.avoid);
    const dBest = good[0].d, dAvoid = bad[0].d;
    const C = chroma(lab), reasons = [];
    if (C > 12) {
      const wG = Math.sin((hue(lab) * Math.PI) / 180);
      if (s.proto.w < -0.3 && wG > 0.5) reasons.push("Es un color cálido (amarillento) y tu paleta es fría.");
      if (s.proto.w > 0.3 && wG < -0.5) reasons.push("Es un color frío (azulado) y tu paleta es cálida.");
      if (s.proto.c < -0.3 && C > 55) reasons.push("Es demasiado intenso para ti: busca la versión más apagada.");
      if (s.proto.c > 0.3 && C < 22) reasons.push("Es demasiado apagado para ti: busca la versión más viva.");
    }
    if (s.proto.d < -0.4 && lab[0] < 28) reasons.push("Es demasiado oscuro para tu colorido claro.");
    if (s.proto.d > 0.4 && lab[0] > 88 && C < 20) reasons.push("Es demasiado pálido para tu colorido profundo.");
    let verdict;
    if (dBest <= 10 && dBest < dAvoid) verdict = "si";
    else if ((dAvoid <= 12 && dAvoid < dBest) || (reasons.length && dBest > 16)) verdict = "no";
    else verdict = dBest <= 18 && !reasons.length ? "si" : "medio";
    if (verdict === "si" && !reasons.length) reasons.push(dBest <= 10 ? "Está en tu paleta." : "Está cerca de tu paleta.");
    if (verdict !== "si" && dAvoid <= 12 && dAvoid < dBest) reasons.unshift("Se parece a un color que te conviene evitar.");
    return { verdict, reasons, match: good[0].hex, alternatives: near(s.best).slice(0, 3).map((x) => x.hex), dBest, lab };
  }

  return {
    rgbToLab, labToRgb, hexToRgb, rgbToHex, hexToLab, chroma, hue, deltaE,
    sampleCircle, whiteBalance, applyGains,
    QUIZ, quizAxes, photoAxes, combineAxes, SEASONS, METALS, MAKEUP, classify, analyze, judge, jewelry, makeup,
  };
});
