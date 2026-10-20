// Probador de pelo y barba (D-22): tinte realista sobre la máscara de pelo de MediaPipe y forma de cada barba
// a partir de la malla de la cara. Sin IA generativa: no cambia el corte, solo el color y la barba.
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./color.js") : root.FA.color);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).pelo = api;
})(typeof self !== "undefined" ? self : this, function (color) {
  "use strict";

  // Tonos de pelo que favorecen a cada familia de colorimetría (reglas habituales de coloristas).
  const HAIR_COLORS = {
    primavera: [["Rubio dorado", "#C9A15B"], ["Castaño miel", "#8A5A2B"], ["Cobrizo claro", "#B5652E"], ["Castaño claro dorado", "#7A5230"]],
    otono: [["Castaño chocolate", "#4A2C1A"], ["Cobrizo", "#8E3B1C"], ["Caoba", "#5E2318"], ["Castaño dorado", "#6B4423"]],
    verano: [["Rubio ceniza", "#A89880"], ["Castaño ceniza", "#5E5048"], ["Castaño claro frío", "#6E5A4E"], ["Gris plata", "#B8B8B8"]],
    invierno: [["Negro azulado", "#15151C"], ["Castaño oscuro frío", "#2E2420"], ["Chocolate oscuro", "#3A2620"], ["Gris plata", "#C8C8CC"]],
  };
  const HAIR_AVOID = {
    primavera: "negro azulado y tonos ceniza oscuros (apagan tu piel dorada)",
    otono: "rubio ceniza y negro azulado (te ponen la piel gris)",
    verano: "cobrizos y dorados intensos (enrojecen tu piel)",
    invierno: "dorados y cobrizos (amarillean tu piel)",
  };

  /**
   * Tiñe el pelo: cada píxel toma el tono (a*, b*) del color elegido y conserva su luz relativa
   * (mechones, brillos y sombras) alrededor de la luminosidad del color objetivo.
   * @param {Uint8ClampedArray} rgba  foto
   * @param {Float32Array} mask  confianza de pelo 0..1 por píxel
   * @returns {Uint8ClampedArray} copia teñida
   */
  function recolor(rgba, mask, targetRgb, strength = 0.85) {
    const n = mask.length, out = new Uint8ClampedArray(rgba);
    let sum = 0, wsum = 0;
    for (let i = 0; i < n; i++) {
      const m = mask[i];
      if (m < 0.5) continue;
      sum += color.rgbToLab([rgba[4 * i], rgba[4 * i + 1], rgba[4 * i + 2]])[0] * m;
      wsum += m;
    }
    if (!wsum) return out;
    const mean = sum / wsum, [Lt, at, bt] = color.rgbToLab(targetRgb);
    for (let i = 0; i < n; i++) {
      const m = Math.min(1, mask[i]) * strength;
      if (m < 0.02) continue;
      const j = 4 * i, src = [rgba[j], rgba[j + 1], rgba[j + 2]];
      const L = color.rgbToLab(src)[0];
      // los brillos se aclaran menos que las sombras se oscurecen: el pelo claro conserva volumen
      const Lp = Math.max(2, Math.min(98, Lt + (L - mean) * (Lt > mean ? 0.7 : 0.9)));
      const k = Math.min(1, Lp / Math.max(Lt, 1)); // las sombras pierden algo de color, como el pelo real
      const rgb = color.labToRgb([Lp, at * k, bt * k]);
      for (let c = 0; c < 3; c++) out[j + c] = src[c] + (rgb[c] - src[c]) * m;
    }
    return out;
  }

  // Índices estándar de la malla de MediaPipe (478 puntos).
  const OVAL_LOW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454];
  const LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
  const UPPER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
  const NOSE_BASE = 2, CHIN = 152;

  const BEARDS = [
    { id: "ninguna", name: "Sin barba" },
    { id: "stubble", name: "Barba de 3 días" },
    { id: "bigote", name: "Bigote" },
    { id: "candado", name: "Candado" },
    { id: "corta", name: "Barba corta" },
    { id: "completa", name: "Barba completa" },
  ];

  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // Aleja un punto de un centro (da volumen a la barba por debajo de la mandíbula).
  const grow = (p, c, k) => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k];

  /**
   * Polígonos de la barba en píxeles: `fill` se rellena y `holes` se recortan (boca), con regla evenodd.
   * @param {{x:number,y:number}[]} lm  landmarks normalizados de MediaPipe
   */
  function beardShapes(lm, w, h, style) {
    const P = (i) => [lm[i].x * w, lm[i].y * h];
    const lips = LIPS.map(P), nose = P(NOSE_BASE), chin = P(CHIN);
    const mouth = lips.reduce((a, p) => [a[0] + p[0] / lips.length, a[1] + p[1] / lips.length], [0, 0]);
    const cL = P(61), cR = P(291);
    const lipTop = P(0);
    const above = (p) => [p[0], p[1] - (lipTop[1] - nose[1]) * 0.85]; // línea bajo la nariz
    // bigote: del labio superior hasta casi la nariz, un poco más ancho que la boca
    const mouthL = lerp(mouth, cL, 1.18), mouthR = lerp(mouth, cR, 1.18);
    const moustache = [mouthL, ...UPPER_LIP.map(P).map((p) => [p[0], p[1] - 2]), mouthR, above(mouthR), lerp(above(mouthR), above(mouthL), 0.5), above(mouthL)];
    if (style === "bigote") return { fill: [moustache], holes: [] };
    const hole = lips.map((p) => grow(p, mouth, 1.04));
    if (style === "candado") {
      const chinL = P(148), chinR = P(377);
      const ring = [above(mouthL), lerp(above(mouthL), above(mouthR), 0.5), above(mouthR), lerp(mouth, cR, 1.35), grow(chinR, mouth, 1.08), grow(chin, mouth, 1.08), grow(chinL, mouth, 1.08), lerp(mouth, cL, 1.35)];
      return { fill: [ring], holes: [hole] };
    }
    // barbas de mejilla: óvalo inferior + línea de mejilla que baja de la patilla a la comisura
    const k = style === "completa" ? 1.12 : style === "corta" ? 1.04 : 1.0;
    const oval = OVAL_LOW.map(P).map((p, i, a) => (i === 0 || i === a.length - 1 ? p : grow(p, mouth, k)));
    const sideL = P(234), sideR = P(454);
    const cheekL = [lerp(sideL, cL, 0.55)[0], lerp(sideL, nose, 0.55)[1]];
    const cheekR = [lerp(sideR, cR, 0.55)[0], lerp(sideR, nose, 0.55)[1]];
    const region = [...oval, cheekR, above(mouthR), lerp(above(mouthR), above(mouthL), 0.5), above(mouthL), cheekL];
    return { fill: [region], holes: [hole] };
  }

  /** Área con signo de un polígono (fórmula del lazo); se usa en los tests para comparar tamaños. */
  function area(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; s += x1 * y2 - x2 * y1; }
    return Math.abs(s) / 2;
  }

  return { HAIR_COLORS, HAIR_AVOID, BEARDS, OVAL_LOW, LIPS, recolor, beardShapes, area };
});
