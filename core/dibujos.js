// Pictogramas SVG generados por código (D-15): formas de cara, cortes, barbas, monturas y conjuntos.
// Puro: devuelve cadenas SVG con atributos de presentación (la CSP prohíbe `style=` en línea).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).dibujos = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SKIN = "#E9C3A0", SKIN_LINE = "#8A6A55", HAIR = "#2B2220", INK = "#2B2220";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const wrap = (vb, label, body, cls = "pic") =>
    `<svg class="${cls}" viewBox="${vb}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  // Catmull-Rom cerrado → curvas Bézier. `sharp` = índices de puntos que se dejan en esquina.
  function smoothPath(pts, sharp = []) {
    const n = pts.length, P = (i) => pts[(i + n) % n];
    let d = `M${P(0).map((v) => v.toFixed(1)).join(",")}`;
    for (let i = 0; i < n; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const k1 = sharp.includes(i % n) ? 0 : 1 / 6, k2 = sharp.includes((i + 1) % n) ? 0 : 1 / 6;
      const c1 = [p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1];
      const c2 = [p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2];
      d += `C${c1.map((v) => v.toFixed(1))} ${c2.map((v) => v.toFixed(1))} ${p2.map((v) => v.toFixed(1))}`;
    }
    return d + "Z";
  }

  // ---- formas de cara: contorno a partir de las mismas proporciones que mide el asesor ----
  const FACE_PROTOS = {
    ovalada: { ratio: 1.42, forehead: 0.9, jaw: 0.72, angular: false },
    redonda: { ratio: 1.12, forehead: 0.88, jaw: 0.82, angular: false },
    cuadrada: { ratio: 1.12, forehead: 0.97, jaw: 0.97, angular: true },
    rectangular: { ratio: 1.55, forehead: 0.96, jaw: 0.94, angular: true },
    alargada: { ratio: 1.62, forehead: 0.86, jaw: 0.74, angular: false },
    corazon: { ratio: 1.36, forehead: 1.0, jaw: 0.6, angular: false },
    diamante: { ratio: 1.42, forehead: 0.7, jaw: 0.62, angular: false },
    triangular: { ratio: 1.3, forehead: 0.72, jaw: 1.0, angular: true },
  };

  function faceOutline(id) {
    const p = FACE_PROTOS[id] || FACE_PROTOS.ovalada;
    const W = 62, len = Math.min(104, p.ratio * W), top = (120 - len) / 2, cx = 50;
    const y = (f) => top + f * len;
    const pts = [
      [cx, top], [cx + (p.forehead * W) / 2, y(0.16)], [cx + W / 2, y(0.45)], [cx + (p.jaw * W) / 2, y(0.78)],
      [cx + (p.angular ? 0.22 : 0.12) * W, y(0.97)], [cx, y(1)], [cx - (p.angular ? 0.22 : 0.12) * W, y(0.97)],
      [cx - (p.jaw * W) / 2, y(0.78)], [cx - W / 2, y(0.45)], [cx - (p.forehead * W) / 2, y(0.16)],
    ];
    return smoothPath(pts, p.angular ? [3, 7] : []);
  }

  function faceShape(id, label) {
    const d = faceOutline(id);
    return wrap("0 0 100 120", label || `Cara ${id}`,
      `<path d="${d}" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2.5"/>`);
  }

  // ---- cabeza base para cortes y barbas ----
  const HEAD = "M50,28 C67,28 76,42 76,60 C76,80 66,96 50,96 C34,96 24,80 24,60 C24,42 33,28 50,28Z";
  function head(inner, label, beardLayer = "") {
    return wrap("0 0 100 120", label,
      `<path d="M40,92 L40,112 L60,112 L60,92Z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.5"/>` +
      `<ellipse cx="23.5" cy="62" rx="4" ry="7" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.5"/>` +
      `<ellipse cx="76.5" cy="62" rx="4" ry="7" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.5"/>` +
      `<path d="${HEAD}" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.5"/>` +
      beardLayer +
      `<g stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none">` +
      `<path d="M36,55 Q41,52 45,55 M55,55 Q59,52 64,55"/><circle cx="41" cy="61" r="1.6" fill="${INK}"/><circle cx="59" cy="61" r="1.6" fill="${INK}"/>` +
      `<path d="M50,63 L48,72 L52,72" stroke-width="1.2"/></g>` +
      `<path d="M44,81 Q50,84 56,81" stroke="#9A4A40" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      inner);
  }

  const CAP_BOTTOM = "C74,46 70,40 64,38 C56,35 44,35 36,38 C30,40 26,46 24,56Z";
  const HAIRCUTS = {
    crew: `<path d="M24,56 C22,32 36,23 50,23 C64,23 78,32 76,56 ${CAP_BOTTOM}" fill="${HAIR}"/>`,
    buzz: `<path d="M24,56 C22,30 36,25 50,25 C64,25 78,30 76,56 ${CAP_BOTTOM}" fill="${HAIR}" opacity=".55"/>`,
    quiff: `<path d="M24,56 C22,32 30,24 38,21 C44,10 62,7 71,13 C66,15 64,18 66,22 C74,28 78,40 76,56 ${CAP_BOTTOM}" fill="${HAIR}"/>`,
    pompadour: `<path d="M24,56 C23,40 25,33 30,30 L70,30 C75,33 77,40 76,56 ${CAP_BOTTOM}" fill="${HAIR}" opacity=".5"/>` +
      `<path d="M30,38 C26,24 34,10 50,9 C66,8 76,18 72,32 C68,36 62,37 56,36 C48,35 38,36 30,38Z" fill="${HAIR}"/>`,
    sidepart: `<path d="M24,56 C22,30 36,20 52,20 C66,20 78,30 76,56 ${CAP_BOTTOM}" fill="${HAIR}"/>` +
      `<path d="M38,22 Q37,30 38,37" stroke="${SKIN}" stroke-width="1.6" fill="none"/>`,
    crop: `<path d="M24,56 C22,31 36,22 50,22 C64,22 78,31 76,56 C75,48 72,45 68,44 L64,47 L60,43 L55,47 L50,43 L45,47 L40,43 L35,47 L32,44 C28,45 25,49 24,56Z" fill="${HAIR}"/>`,
    medium: `<path d="M21,74 C14,40 30,17 50,17 C70,17 86,40 79,74 C77,64 75,54 73,47 C64,38 36,38 27,47 C25,54 23,64 21,74Z" fill="${HAIR}"/>` +
      `<path d="M27,47 Q30,60 25,70 M73,47 Q70,60 75,70" stroke="#4A3A35" stroke-width="1.2" fill="none"/>`,
    slick: `<path d="M24,56 C22,30 34,17 50,17 C66,17 78,30 76,56 ${CAP_BOTTOM}" fill="${HAIR}"/>` +
      `<path d="M38,37 Q44,22 62,20 M46,36 Q52,24 68,24 M56,35 Q62,28 72,30" stroke="#5A4A45" stroke-width="1.2" fill="none"/>`,
    fauxhawk: `<path d="M24,56 C22,34 36,26 50,26 C64,26 78,34 76,56 ${CAP_BOTTOM}" fill="${HAIR}" opacity=".5"/>` +
      `<path d="M40,37 L42,16 L46,26 L50,10 L54,26 L58,16 L60,37Z" fill="${HAIR}"/>`,
    curly: `<path d="M24,56 C23,40 26,34 30,32 L70,32 C74,34 77,40 76,56 ${CAP_BOTTOM}" fill="${HAIR}" opacity=".55"/>` +
      [[34, 30], [42, 24], [50, 21], [58, 24], [66, 30], [38, 36], [46, 31], [54, 31], [62, 36], [50, 14], [42, 16], [58, 16]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${HAIR}"/>`).join(""),
    sides: `<path d="M19,66 C17,34 33,20 50,20 C67,20 83,34 81,66 C79,56 75,47 69,42 C59,37 41,37 31,42 C25,47 21,56 19,66Z" fill="${HAIR}"/>`,
    bowl: `<path d="M22,62 C19,30 34,18 50,18 C66,18 81,30 78,62 L77,48 C68,46 32,46 23,48Z" fill="${HAIR}"/>`,
    receding: `<path d="M24,56 C22,36 30,28 36,27 C40,34 46,30 50,30 C54,30 60,34 64,27 C70,28 78,36 76,56 ${CAP_BOTTOM}" fill="${HAIR}"/>`,
  };

  const BEARD_REGION = "M24,60 C24,82 34,101 50,102 C66,101 76,82 76,60 C73,68 69,73 63,75 C58,72 42,72 37,75 C31,73 27,68 24,60Z";
  const MOUSTACHE = "M41,79 Q50,74 59,79 Q60,82 57,81 Q50,78 43,81 Q40,82 41,79Z";
  const BEARDS = {
    stubble: `<path d="${BEARD_REGION}" fill="${HAIR}" opacity=".28"/><path d="${MOUSTACHE}" fill="${HAIR}" opacity=".3"/>`,
    box: `<path d="M25,62 L27,74 C30,90 40,98 50,98 C60,98 70,90 73,74 L75,62 C72,69 68,73 63,75 C58,72 42,72 37,75 C32,73 28,69 25,62Z" fill="${HAIR}"/><path d="${MOUSTACHE}" fill="${HAIR}"/>`,
    full: `<path d="${BEARD_REGION}" fill="${HAIR}"/><path d="${MOUSTACHE}" fill="${HAIR}"/>`,
    long: `<path d="M24,60 C24,84 36,110 50,116 C64,110 76,84 76,60 C73,68 69,73 63,75 C58,72 42,72 37,75 C31,73 27,68 24,60Z" fill="${HAIR}"/><path d="${MOUSTACHE}" fill="${HAIR}"/>`,
    goatee: `<path d="${MOUSTACHE}" fill="${HAIR}"/><path d="M41,80 L40,90 Q50,100 60,90 L59,80 Q57,86 50,86 Q43,86 41,80Z" fill="${HAIR}"/>`,
    circle: `<path d="M41,79 Q50,73 59,79 Q63,84 60,90 Q50,100 40,90 Q37,84 41,79Z M44,81 Q50,85 56,81 Q54,87 50,87 Q46,87 44,81Z" fill="${HAIR}" fill-rule="evenodd"/>`,
    balbo: `<path d="M40,78 Q50,74 60,78 Q59,80 50,79 Q41,80 40,78Z" fill="${HAIR}"/><path d="M38,86 Q50,90 62,86 L62,90 Q50,101 38,90Z" fill="${HAIR}"/>`,
    vandyke: `<path d="M40,79 Q50,74 60,79 Q62,77 63,75 Q63,80 58,81 Q50,78 42,81 Q37,80 37,75 Q38,77 40,79Z" fill="${HAIR}"/><path d="M45,86 Q50,88 55,86 L50,100Z" fill="${HAIR}"/>`,
    chinstrap: `<path d="M24,60 C24,82 34,100 50,100 C66,100 76,82 76,60 L73,62 C72,80 64,95 50,95 C36,95 28,80 27,62Z" fill="${HAIR}"/>`,
    moustache: `<path d="${MOUSTACHE}" fill="${HAIR}" transform="translate(-6 -3) scale(1.12)"/>`,
  };

  // ---- monturas (vista frontal, solo las gafas) ----
  const lens = (d) => `<path d="${d}" transform="translate(0 0)"/><path d="${d}" transform="translate(120 0) scale(-1 1)"/>`;
  const GLASSES = {
    rect: lens("M14,14 H52 Q55,14 55,17 V33 Q55,36 52,36 H14 Q11,36 11,33 V17 Q11,14 14,14Z"),
    square: lens("M15,10 H52 Q55,10 55,13 V36 Q55,39 52,39 H15 Q12,39 12,36 V13 Q12,10 15,10Z"),
    round: lens("M33,8 A17,17 0 1 1 32.9,8Z"),
    oval: lens("M33,12 C46,12 55,18 55,25 C55,32 46,38 33,38 C20,38 11,32 11,25 C11,18 20,12 33,12Z"),
    wayfarer: lens("M10,12 L55,12 L52,34 Q51,38 46,38 L20,38 Q15,38 14,34Z") + `<path d="M10,12 H110" stroke-width="5"/>`,
    aviator: lens("M12,14 H54 Q56,14 55,20 C53,34 46,42 34,42 C20,42 12,32 12,20 Q12,14 12,14Z") + `<path d="M50,13 Q60,9 70,13" />`,
    browline: lens("M12,22 C12,34 20,40 33,40 C46,40 54,34 54,22") + `<path d="M8,15 Q10,12 16,12 H52 Q56,12 56,18 L54,22 H12 L9,20Z M112,15 Q110,12 104,12 H68 Q64,12 64,18 L66,22 H108 L111,20Z" fill="currentColor"/>`,
    panto: lens("M12,14 H54 C55,30 46,40 33,40 C20,40 11,30 12,14Z"),
    rimless: `<g stroke-dasharray="2 3" stroke-width="1.5">${lens("M14,14 H52 Q55,14 55,17 V33 Q55,36 52,36 H14 Q11,36 11,33 V17 Q11,14 14,14Z")}</g>`,
    big: lens("M12,6 H53 Q56,6 56,9 V40 Q56,44 52,44 H14 Q10,44 10,40 V9 Q10,6 12,6Z"),
    bottomwide: lens("M18,14 H50 Q54,14 55,18 L56,32 Q55,40 46,40 H18 Q9,40 10,30 L12,20 Q13,14 18,14Z"),
    small: lens("M22,18 H48 Q50,18 50,20 V30 Q50,32 48,32 H22 Q20,32 20,30 V20 Q20,18 22,18Z"),
  };
  const BRIDGE = `<path d="M55,22 Q60,18 65,22" fill="none"/><path d="M11,18 L2,16 M109,18 L118,16" />`;

  function glasses(id, label, color = INK) {
    const body = GLASSES[id] || GLASSES.rect;
    return wrap("0 0 120 50", label || id,
      `<g fill="${color}" fill-opacity=".08" stroke="${color}" stroke-width="3.2" stroke-linejoin="round" color="${color}">${body}${BRIDGE}</g>`);
  }

  // ---- texto de la recomendación → dibujo ----
  const ICONS = {
    cut: [
      [/pompadour/i, "pompadour"], [/faux hawk|cresta/i, "fauxhawk"], [/quiff|tupé/i, "quiff"],
      [/curly|rizo/i, "curly"], [/crop|flequillo/i, "crop"], [/hacia atrás|tirante/i, "slick"],
      [/medio largo|ondas/i, "medium"], [/laterales (con algo de largo|medios|con algo de volumen|largos)|lados no rapados|a los lados/i, "sides"],
      [/casco/i, "bowl"], [/crew|militar|corto/i, "crew"], [/rapado|al cero|degradado alto|geométricos/i, "buzz"],
      [/raya/i, "sidepart"], [/altura|volumen/i, "quiff"],
    ],
    beard: [
      [/stubble|3–5 días/i, "stubble"], [/ancla|balbo/i, "balbo"], [/van dyke/i, "vandyke"],
      [/circle|redonda/i, "circle"], [/candado|goatee|perilla/i, "goatee"], [/chin strap|contorno|cuello/i, "chinstrap"],
      [/caja|box/i, "box"], [/punta|larga/i, "long"], [/bigote/i, "moustache"], [/completa|mejillas|patillas|voluminosa/i, "full"],
      [/corta/i, "box"],
    ],
    glasses: [
      [/browline|clubmaster|parte superior/i, "browline"], [/wayfarer/i, "wayfarer"], [/aviador/i, "aviator"], [/panto/i, "panto"],
      [/al aire|sin montura/i, "rimless"], [/redondas/i, "round"], [/ovaladas/i, "oval"],
      [/parte inferior más ancha|base más ancha|base ancha/i, "bottomwide"], [/grandes|altura|enormes/i, "big"],
      [/pequeñas|estrechas/i, "small"], [/cuadradas/i, "square"], [/rectangular/i, "rect"], [/puente/i, "wayfarer"],
    ],
  };

  function iconFor(kind, title) {
    for (const [re, id] of ICONS[kind] || []) if (re.test(title)) return id;
    return null;
  }

  function haircut(id, label) { return head(HAIRCUTS[id] || HAIRCUTS.crew, label || id); }
  function beard(id, label) { return head(HAIRCUTS.crew, label || id, BEARDS[id] || ""); }

  // ---- conjuntos de ropa: figura sencilla rellena con colores de la paleta ----
  /**
   * @param {{top:string, outer?:string, outerType?:"blazer"|"overshirt"|"hoodie"|"jacket", bottom:string,
   *   bottomType?:"pants"|"jeans"|"shorts", shoes:string, shoeType?:"sneaker"|"boot"|"dress", tie?:string}} o
   */
  function outfit(o, label) {
    const legs = o.bottomType === "shorts"
      ? `<path d="M34,96 L66,96 L68,128 L52,128 L50,108 L48,128 L32,128Z" fill="${o.bottom}"/>` +
        `<path d="M34,128 L46,128 L46,168 L35,168Z M54,128 L66,128 L65,168 L54,168Z" fill="${SKIN}"/>`
      : `<path d="M34,96 L66,96 L67,168 L54,168 L50,112 L46,168 L33,168Z" fill="${o.bottom}"/>` +
        (o.bottomType === "jeans" ? `<path d="M50,98 V112 M38,100 Q42,104 46,100" stroke="#F2D27A" stroke-width=".8" fill="none" opacity=".8"/>` : "");
    const shoe = o.shoeType === "boot"
      ? `<path d="M32,160 L47,160 L48,176 L28,176 Q28,170 32,168Z M53,160 L68,160 L72,168 Q72,176 72,176 L52,176Z" fill="${o.shoes}"/>`
      : `<path d="M33,168 L47,168 L48,176 L26,176 Q26,170 33,168Z M53,168 L67,168 Q74,170 74,176 L52,176Z" fill="${o.shoes}"/>` +
        (o.shoeType === "sneaker" ? `<path d="M26,176 H48 M52,176 H74" stroke="#FFFFFF" stroke-width="2"/>` : "");
    const torso = "M30,36 Q50,30 70,36 L78,44 L74,98 L26,98 L22,44Z";
    const arms = (fill) => `<path d="M22,44 L12,92 L20,94 L30,56Z M78,44 L88,92 L80,94 L70,56Z" fill="${fill}"/>`;
    let top = arms(o.outer || o.top) + `<path d="${torso}" fill="${o.top}"/>`;
    if (o.tie) top += `<path d="M48,38 L52,38 L54,72 L50,78 L46,72Z" fill="${o.tie}"/>`;
    if (o.outer && o.outerType === "hoodie") {
      top = arms(o.outer) + `<path d="${torso}" fill="${o.outer}"/><path d="M36,34 Q50,22 64,34 Q50,44 36,34Z" fill="${o.outer}" stroke="#00000033"/><path d="M47,40 V56 M53,40 V56" stroke="#FFFFFF" stroke-width="1.2"/>`;
    } else if (o.outer) {
      const lapel = o.outerType === "blazer" ? `<path d="M40,34 L50,66 L36,52Z M60,34 L50,66 L64,52Z" fill="#00000026"/>` : "";
      top += `<path d="M30,36 L22,44 L26,98 L46,98 L50,66 L44,34Z M70,36 L78,44 L74,98 L54,98 L50,66 L56,34Z" fill="${o.outer}"/>${lapel}`;
      if (o.outerType === "overshirt") top += `<path d="M30,58 H42 M58,58 H70" stroke="#00000033" stroke-width="1.5"/>`;
    }
    const headG = `<path d="M44,26 L56,26 L56,34 L44,34Z" fill="${SKIN}"/><circle cx="50" cy="16" r="12" fill="${SKIN}"/><path d="M38,14 Q40,2 50,3 Q61,3 62,14 Q56,8 50,9 Q43,9 38,14Z" fill="${HAIR}"/>` +
      `<circle cx="16" cy="95" r="4" fill="${SKIN}"/><circle cx="84" cy="95" r="4" fill="${SKIN}"/>`;
    return wrap("0 0 100 180", label || "Conjunto", headG + legs + shoe + top, "pic outfit");
  }

  return { FACE_PROTOS, HAIRCUTS, BEARDS, GLASSES, faceShape, faceOutline, haircut, beard, glasses, outfit, iconFor, smoothPath };
});
