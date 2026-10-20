// Asesor de estilo: a partir de 8 puntos que marca la persona sobre su foto de frente, estima la
// forma de la cara y devuelve cortes, gafas y barbas recomendados. Sin modelos ni red: geometría
// (proporciones) + tabla de recomendaciones de visagismo. Es orientativo, no ciencia exacta.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).asesor = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Puntos que marca la persona. `def` = posición inicial respecto a la caja de la cara
  // (dx en anchos de cara desde el centro, dy en anchos de cara desde el borde superior).
  const POINTS = [
    { id: "top", label: "Nacimiento del pelo", hint: "en el centro de la frente", def: [0, 0] },
    { id: "chin", label: "Mentón", hint: "la punta del hueso, no la de la barba", def: [0, 1.35] },
    { id: "foreL", label: "Sien izq.", hint: "lado de la frente, a la altura de la mitad de la frente", def: [-0.42, 0.18] },
    { id: "foreR", label: "Sien der.", hint: "lado de la frente, a la altura de la mitad de la frente", def: [0.42, 0.18] },
    { id: "cheekL", label: "Pómulo izq.", hint: "la parte más ancha de la cara", def: [-0.5, 0.58] },
    { id: "cheekR", label: "Pómulo der.", hint: "la parte más ancha de la cara", def: [0.5, 0.58] },
    { id: "jawL", label: "Mandíbula izq.", hint: "el ángulo del hueso, debajo de la oreja (no el borde de la barba)", def: [-0.4, 1.02] },
    { id: "jawR", label: "Mandíbula der.", hint: "el ángulo del hueso, debajo de la oreja (no el borde de la barba)", def: [0.4, 1.02] },
  ];

  /** Posiciones iniciales en píxeles a partir de la caja de la cara {cx, top, width} (o del centro de la foto). */
  function defaultPoints(w, h, box) {
    const b = box || { cx: w / 2, top: h * 0.22, width: Math.min(w * 0.45, h * 0.3) };
    const out = {};
    for (const p of POINTS) out[p.id] = [b.cx + p.def[0] * b.width, b.top + p.def[1] * b.width];
    return out;
  }

  // Índices de la malla de MediaPipe Face Landmarker (478 puntos) para cada punto del asesor.
  // top/chin: centro del óvalo arriba y abajo; sienes: lateral alto de la frente; pómulos: lo más ancho; mandíbula: ángulo.
  const MESH = { top: 10, chin: 152, fore: [54, 284], cheek: [234, 454], jaw: [172, 397] };

  /**
   * Puntos del asesor a partir de landmarks normalizados (0..1) de MediaPipe.
   * La malla acaba algo por debajo del nacimiento del pelo: `top` se sube un 8 % del largo de la cara.
   * L/R se asignan por posición en la foto (L = izquierda de la imagen), como el resto del asesor.
   */
  function fromLandmarks(lm, w, h) {
    const P = (i) => [lm[i].x * w, lm[i].y * h];
    const pair = ([a, b]) => { const pa = P(a), pb = P(b); return pa[0] <= pb[0] ? [pa, pb] : [pb, pa]; };
    const chin = P(MESH.chin), top0 = P(MESH.top);
    const top = [top0[0] + (top0[0] - chin[0]) * 0.08, top0[1] + (top0[1] - chin[1]) * 0.08];
    const [foreL, foreR] = pair(MESH.fore), [cheekL, cheekR] = pair(MESH.cheek), [jawL, jawR] = pair(MESH.jaw);
    return { top, chin, foreL, foreR, cheekL, cheekR, jawL, jawR };
  }

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Ángulo en `v` entre los segmentos v→a y v→b, en grados.
  function angleAt(v, a, b) {
    const ux = a[0] - v[0], uy = a[1] - v[1], wx = b[0] - v[0], wy = b[1] - v[1];
    const c = (ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy) || 1);
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  }

  /**
   * Medidas independientes de escala y giro.
   * ratio = largo / ancho de pómulos; forehead, jaw = anchos relativos a los pómulos;
   * jawAngle = ángulo pómulo-mandíbula-mentón (bajo = mandíbula cuadrada, alto = redondeada).
   */
  function measure(p) {
    const length = dist(p.top, p.chin);
    const forehead = dist(p.foreL, p.foreR);
    const cheek = dist(p.cheekL, p.cheekR);
    const jaw = dist(p.jawL, p.jawR);
    if (!(cheek > 0 && length > 0)) return null;
    const jawAngle = (angleAt(p.jawL, p.cheekL, p.chin) + angleAt(p.jawR, p.cheekR, p.chin)) / 2;
    return { ratio: length / cheek, forehead: forehead / cheek, jaw: jaw / cheek, jawAngle };
  }

  // Prototipo de cada forma con las mismas medidas que `measure`.
  const SHAPES = {
    ovalada: { name: "Ovalada", proto: { ratio: 1.42, forehead: 0.9, jaw: 0.8, jawAngle: 142 },
      desc: "Algo más larga que ancha, pómulos como zona más ancha y mandíbula suave que se estrecha hacia el mentón.",
      goal: "Es la forma más equilibrada: casi todo te queda. Solo evita tapar la cara o alargarla de más." },
    redonda: { name: "Redonda", proto: { ratio: 1.18, forehead: 0.9, jaw: 0.84, jawAngle: 138 },
      desc: "Largo y ancho parecidos, mejillas llenas y mandíbula redondeada sin ángulos marcados.",
      goal: "Alargar visualmente (volumen arriba, poco a los lados) y añadir ángulos (gafas rectas, barba definida)." },
    cuadrada: { name: "Cuadrada", proto: { ratio: 1.18, forehead: 0.96, jaw: 0.95, jawAngle: 116 },
      desc: "Frente, pómulos y mandíbula de anchura parecida; mandíbula ancha y angulosa.",
      goal: "Ya tienes los ángulos: lúcelos con cortes limpios, o suavízalos con gafas redondeadas." },
    rectangular: { name: "Rectangular", proto: { ratio: 1.62, forehead: 0.96, jaw: 0.94, jawAngle: 120 },
      desc: "Larga, con frente, pómulos y mandíbula de anchura parecida y mandíbula angulosa.",
      goal: "No alargarla más: menos altura arriba, algo de volumen a los lados y barba que ensanche." },
    alargada: { name: "Alargada", proto: { ratio: 1.68, forehead: 0.9, jaw: 0.82, jawAngle: 142 },
      desc: "Claramente más larga que ancha, con mandíbula suave.",
      goal: "Acortar y ensanchar: flequillo o textura hacia delante, laterales no rapados, gafas grandes." },
    corazon: { name: "Corazón (triángulo invertido)", proto: { ratio: 1.38, forehead: 1.0, jaw: 0.72, jawAngle: 146 },
      desc: "Frente ancha y mentón estrecho o en punta.",
      goal: "Restar peso a la frente y dárselo al mentón (barba completa, gafas con la base más ancha)." },
    diamante: { name: "Diamante", proto: { ratio: 1.45, forehead: 0.78, jaw: 0.74, jawAngle: 142 },
      desc: "Pómulos claramente más anchos que la frente y la mandíbula.",
      goal: "Ensanchar frente y mentón para equilibrar los pómulos." },
    triangular: { name: "Triangular", proto: { ratio: 1.32, forehead: 0.8, jaw: 1.0, jawAngle: 124 },
      desc: "Mandíbula más ancha que la frente.",
      goal: "Dar volumen arriba y a los lados de la cabeza y no ensanchar más la mandíbula." },
  };

  // Tolerancia típica de cada medida al marcar a mano (para que todas pesen parecido).
  const SPREAD = { ratio: 0.12, forehead: 0.07, jaw: 0.07, jawAngle: 12 };

  /** Formas ordenadas de más a menos parecida, con un porcentaje relativo (suma 100). */
  function classify(m) {
    const scored = Object.entries(SHAPES).map(([id, s]) => {
      let d2 = 0;
      for (const k of Object.keys(SPREAD)) d2 += ((m[k] - s.proto[k]) / SPREAD[k]) ** 2;
      return { id, name: s.name, score: Math.exp(-d2 / 2) };
    });
    const total = scored.reduce((a, s) => a + s.score, 0);
    for (const s of scored) s.pct = total > 0 ? (100 * s.score) / total : 100 / scored.length;
    return scored.sort((a, b) => b.score - a.score);
  }

  // `need` en barbas: lo poblada que tiene que ser la barba en las mejillas para que funcione.
  // 0 = sirve con mejillas escasas, 1 = media, 2 = barba completa.
  const RECS = {
    ovalada: {
      cuts: [
        ["Quiff o tupé texturizado", "mantiene el equilibrio sin alargar de más"],
        ["Raya lateral clásica (side part)", "limpio y versátil; te queda formal o informal"],
        ["Crew cut / corte corto con degradado", "deja ver la forma, que ya es equilibrada"],
        ["Medio largo peinado hacia atrás", "si quieres largo, tu forma lo admite"],
      ],
      cutsAvoid: ["Flequillo recto y pesado que tape la frente (acorta y redondea)"],
      glasses: [
        ["Rectangulares de anchura igual a la cara", "casi cualquier montura te queda; esta es la apuesta segura"],
        ["Aviador", "acompaña la forma ovalada"],
        ["Wayfarer", "aporta carácter sin desequilibrar"],
      ],
      glassesAvoid: ["Monturas enormes que tapen más de media cara", "Monturas mucho más estrechas que tu cara"],
      beards: [
        ["Barba corta en caja (box)", "contorno definido sin cambiar proporciones", 1],
        ["Stubble (barba de 3–5 días)", "marca la mandíbula sin añadir volumen", 1],
        ["Candado (goatee + bigote)", "buena opción si las mejillas salen poco pobladas", 0],
        ["Barba completa media", "si la tienes poblada, te la puedes permitir", 2],
      ],
      beardsAvoid: ["Barba muy larga y en punta (alarga la cara)"],
    },
    redonda: {
      cuts: [
        ["Pompadour o tupé alto con laterales en degradado (fade)", "la altura arriba alarga la cara y los lados cortos la estrechan"],
        ["Quiff con volumen", "mismo efecto con un aspecto más desenfadado"],
        ["Raya lateral con volumen arriba y lados cortos", "la raya rompe la simetría redonda"],
        ["Faux hawk (cresta discreta)", "lleva la vista hacia arriba"],
      ],
      cutsAvoid: ["Corte en casco o flequillo recto", "Laterales largos o con volumen (ensanchan)", "Rapado uniforme al mismo número", "Raya al centro con el pelo plano"],
      glasses: [
        ["Rectangulares o cuadradas", "las líneas rectas añaden los ángulos que la cara no tiene"],
        ["Wayfarer", "parte superior marcada y ángulos: alargan y definen"],
        ["Browline / clubmaster", "la barra superior gruesa sube la vista y alarga"],
      ],
      glassesAvoid: ["Redondas u ovaladas (repiten la forma)", "Monturas pequeñas o estrechas (la cara parece más ancha)"],
      beards: [
        ["Barba corta con laterales rebajados y mentón más largo", "alarga la cara y dibuja una mandíbula", 1],
        ["Ancla o Balbo", "barba en el mentón, sin patillas: alarga sin ensanchar", 0],
        ["Candado / Van Dyke alargado", "pone el peso en el centro y abajo", 0],
        ["Barba en caja con contorno recto en mejillas y cuello marcado", "una línea de cuello limpia define la mandíbula", 1],
      ],
      beardsAvoid: ["Barba completa voluminosa en las mejillas (ensancha)", "Patillas anchas y largas", "Línea del cuello difusa o demasiado baja"],
    },
    cuadrada: {
      cuts: [
        ["Crew cut o militar", "resalta la mandíbula fuerte"],
        ["Raya lateral clásica", "elegante con caras angulosas"],
        ["Quiff texturizado", "la textura suaviza lo geométrico"],
        ["Medio largo con ondas", "suaviza si quieres menos dureza"],
      ],
      cutsAvoid: ["Flequillo recto y plano (cara de caja)", "Cortes muy geométricos con aristas en los lados"],
      glasses: [
        ["Redondas o panto", "contrastan con los ángulos"],
        ["Ovaladas", "suavizan la mandíbula"],
        ["Aviador", "base curva que equilibra"],
      ],
      glassesAvoid: ["Cuadradas muy angulosas y gruesas (endurecen)", "Monturas estrechas"],
      beards: [
        ["Stubble (3–5 días)", "marca la mandíbula sin añadir masa", 1],
        ["Barba corta redondeada en el mentón", "suaviza la esquina de la mandíbula", 1],
        ["Circle beard (bigote + perilla redonda)", "suaviza el centro", 0],
      ],
      beardsAvoid: ["Barba en caja muy recta en la mandíbula (aún más cuadrada)"],
    },
    rectangular: {
      cuts: [
        ["Laterales con algo de largo (tijera, no rapado)", "da anchura a una cara larga"],
        ["Crop francés o flequillo texturizado", "acorta la frente"],
        ["Raya lateral baja, volumen moderado", "elegante sin añadir altura"],
      ],
      cutsAvoid: ["Pompadour o tupé alto (alarga más)", "Laterales al cero"],
      glasses: [
        ["Grandes y con altura (más profundidad vertical)", "rompen la longitud de la cara"],
        ["Wayfarer con puente grueso", "marca una línea horizontal"],
        ["Aviador", "cubre más superficie vertical"],
      ],
      glassesAvoid: ["Pequeñas y estrechas"],
      beards: [
        ["Barba completa con volumen en mejillas", "ensancha la parte baja", 2],
        ["Bigote marcado", "una línea horizontal acorta la cara", 0],
        ["Barba corta en caja", "ancha a los lados, corta en el mentón", 1],
      ],
      beardsAvoid: ["Goatee o barba en punta larga (alarga)"],
    },
    alargada: {
      cuts: [
        ["Flequillo texturizado o crop", "acorta la frente"],
        ["Laterales medios, no rapados", "ensanchan"],
        ["Medio largo con ondas a los lados", "añade anchura"],
      ],
      cutsAvoid: ["Mucha altura arriba", "Degradado alto al cero"],
      glasses: [
        ["Grandes y altas", "ocupan altura y acortan la cara"],
        ["Redondas u ovaladas grandes", "suavizan una cara larga y estrecha"],
        ["Puente bajo y grueso", "corta la línea vertical de la nariz"],
      ],
      glassesAvoid: ["Pequeñas y estrechas", "Sin montura (no rompen la longitud)"],
      beards: [
        ["Barba completa con mejillas", "ensancha", 2],
        ["Bigote", "línea horizontal", 0],
        ["Stubble", "relleno ligero a los lados", 1],
      ],
      beardsAvoid: ["Perilla o barba en punta"],
    },
    corazon: {
      cuts: [
        ["Medio largo o con algo de largo a los lados", "equilibra la frente ancha"],
        ["Flequillo lateral texturizado", "estrecha la frente visualmente"],
        ["Raya lateral con volumen moderado", "sin cargar arriba"],
      ],
      cutsAvoid: ["Laterales rapados con mucho volumen arriba (agrandan la frente)", "Peinado hacia atrás tirante"],
      glasses: [
        ["Con la parte inferior más ancha que la superior", "llevan peso hacia abajo"],
        ["Aviador", "base ancha"],
        ["Ovaladas o al aire (sin montura)", "ligeras arriba"],
      ],
      glassesAvoid: ["Browline / clubmaster (cargan la parte de arriba)", "Decoradas en la parte superior"],
      beards: [
        ["Barba completa corta-media", "da masa al mentón estrecho", 2],
        ["Barba en caja", "ensancha la mandíbula", 1],
        ["Chin strap / barba de contorno", "dibuja una mandíbula más ancha", 1],
      ],
      beardsAvoid: ["Perilla fina sola (afina aún más el mentón)"],
    },
    diamante: {
      cuts: [
        ["Flequillo texturizado o crop", "ensancha la frente"],
        ["Laterales con algo de volumen", "suaviza los pómulos"],
        ["Medio largo peinado hacia atrás con textura", "da anchura arriba"],
      ],
      cutsAvoid: ["Laterales muy cortos (resaltan los pómulos)", "Cresta o pico en el centro"],
      glasses: [
        ["Browline / clubmaster", "ensanchan la línea de las cejas"],
        ["Ovaladas", "suavizan los pómulos"],
        ["Al aire (sin montura)", "no compiten con los pómulos"],
      ],
      glassesAvoid: ["Estrechas, más angostas que los pómulos"],
      beards: [
        ["Barba completa", "rellena mentón y mandíbula", 2],
        ["Barba en caja", "ensancha la parte baja", 1],
        ["Candado ancho", "da masa al mentón", 0],
      ],
      beardsAvoid: ["Patillas finas y largas", "Perilla en punta"],
    },
    triangular: {
      cuts: [
        ["Quiff o textura con volumen", "ensancha la parte de arriba"],
        ["Raya lateral con volumen y lados no rapados", "equilibra la mandíbula"],
        ["Medio largo", "añade anchura a la altura de las sienes"],
      ],
      cutsAvoid: ["Muy corto arriba y en los lados", "Degradado alto al cero"],
      glasses: [
        ["Browline / clubmaster", "peso visual arriba"],
        ["Aviador o con la parte superior marcada", "ensanchan la frente"],
      ],
      glassesAvoid: ["Monturas con la base más ancha que la parte de arriba", "Pequeñas"],
      beards: [
        ["Stubble", "no añade volumen a la mandíbula", 1],
        ["Barba corta, más corta a los lados que en el mentón", "estrecha la mandíbula", 1],
        ["Bigote", "lleva la vista al centro", 0],
      ],
      beardsAvoid: ["Barba voluminosa a los lados de la mandíbula"],
    },
  };

  const HAIR_TIPS = {
    liso: "Pelo liso: el tupé y el quiff necesitan secador hacia arriba y pomada o cera mate para aguantar.",
    ondulado: "Pelo ondulado: deja 5–8 cm arriba y aprovecha la textura; una crema de peinado ligera basta.",
    rizado: "Pelo rizado: rizos arriba con los lados en degradado (curly top) logran el mismo efecto que un tupé.",
  };

  /**
   * Informe completo.
   * @param {object} points  {id: [x, y]} en píxeles
   * @param {{hair?: "liso"|"ondulado"|"rizado", beard?: 0|1|2, receding?: boolean}} opts
   *   beard = lo poblada que sale en las mejillas (0 escasa, 1 media, 2 completa).
   */
  function advise(points, opts = {}) {
    const m = measure(points);
    if (!m) return null;
    const ranking = classify(m);
    const main = ranking[0], second = ranking[1];
    const s = SHAPES[main.id], r = RECS[main.id];
    const beard = opts.beard ?? 2;
    const tips = [];
    if (opts.hair && HAIR_TIPS[opts.hair]) tips.push(HAIR_TIPS[opts.hair]);
    if (opts.receding) tips.push("Con entradas, evita peinarlo todo hacia atrás y tirante: la textura hacia delante (crop) o una raya lateral desenfadada las disimula.");
    if (beard < 2) tips.push("Como la barba no sale completa en las mejillas, se priorizan estilos que no dependen de ellas; rebaja mejillas y patillas y deja más largo en mentón y bigote.");
    tips.push("Gafas: el ancho total de la montura ≈ el de tus sienes, y la línea superior a la altura de las cejas o justo debajo.");
    const pick = (list) => list.map(([title, why, need]) => ({ title, why, ok: need === undefined || need <= beard }));
    const beards = pick(r.beards);
    return {
      measures: m,
      shape: { id: main.id, name: s.name, pct: main.pct, desc: s.desc, goal: s.goal },
      // una segunda forma cercana se menciona si está razonablemente cerca de la primera
      close: second.score > main.score * 0.5 ? { id: second.id, name: second.name, pct: second.pct } : null,
      ranking: ranking.map(({ id, name, pct }) => ({ id, name, pct })),
      cuts: pick(r.cuts), cutsAvoid: r.cutsAvoid,
      glasses: pick(r.glasses), glassesAvoid: r.glassesAvoid,
      beards: beards.filter((b) => b.ok), beardsLater: beards.filter((b) => !b.ok), beardsAvoid: r.beardsAvoid,
      tips,
    };
  }

  return { POINTS, SHAPES, RECS, MESH, defaultPoints, fromLandmarks, measure, classify, advise };
});
