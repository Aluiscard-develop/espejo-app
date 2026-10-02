// Pipeline: gris → línea XDoG → tono → color base → sombreado → composición con el fondo → post.
(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const api = factory(isNode ? require("./ops.js") : root.FA.ops);
  if (isNode) module.exports = api;
  else (root.FA = root.FA || {}).render = api;
})(typeof self !== "undefined" ? self : this, function (ops) {
  "use strict";
  const { clamp01, clamp255 } = ops;

  // Los estilos se ajustaron sobre fotos de 1400 px de lado mayor. `adj.scale` = lado mayor / 1400:
  // todo lo que se mide en píxeles se multiplica por él, así 2400 px da más detalle, no líneas más finas.
  const REFERENCE_SIDE = 1400;

  // Parámetros efectivos = estilo + ajustes del usuario.
  function effective(preset, adj = {}) {
    const scale = adj.scale > 0 ? adj.scale : 1;
    return {
      scale,
      sigma: preset.line.sigma * scale,
      phi: preset.line.phi,
      tau: adj.tau !== undefined ? adj.tau : preset.line.tau,
      thick: Math.max(0, Math.round((preset.line.thick + (adj.thick || 0)) * scale)),
      dark: preset.tone.dark + (adj.dark || 0),
    };
  }

  /**
   * Fase pesada: persona estilizada y fondo con su tinta, sin mezclar.
   * Separada de `composite` para que retocar la máscara con el pincel no recalcule todo.
   * @param {{data: Uint8ClampedArray, width: number, height: number}} image
   * @param {object} preset  ver styles.js
   * @param {object} [adj]   {thick, tau, dark, scale}
   * @param {Uint8ClampedArray|null} [bgLayer]  fondo del estilo ya dibujado (RGBA)
   * @returns {{width: number, height: number, person: Uint8ClampedArray, background: Uint8ClampedArray|null, post: object}}
   */
  function renderLayers(image, preset, adj = {}, bgLayer = null) {
    const { width: w, height: h, data: src } = image;
    const n = w * h;
    const p = effective(preset, adj);
    const gray = ops.stretchContrast(ops.luminance(src, n));
    const line = ops.thicken(ops.xdog(gray, w, h, { sigma: p.sigma, tau: p.tau, phi: p.phi }), w, h, p.thick);
    const k = p.scale;
    const tone = ops.gaussianBlur(gray, w, h, 2.2 * k);

    const ink = ops.hexToRgb(preset.ink);
    const col = preset.color;
    const paper = ops.hexToRgb(col.paper || "#e9dfcf");
    const stops = col.kind === "map" ? col.stops.map(ops.hexToRgb) : null;
    const tint = col.shadowTint ? ops.hexToRgb(col.shadowTint) : null;
    let R, G, B;
    if (col.kind === "cel") {
      const ch = (c) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = src[4 * i + c]; return ops.gaussianBlur(a, w, h, 2 * k); };
      R = ch(0); G = ch(1); B = ch(2);
    }

    const t0 = preset.tone;
    const person = new Uint8ClampedArray(4 * n);
    const background = bgLayer ? new Uint8ClampedArray(4 * n) : null;
    const base = [0, 0, 0];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = tone[i] - p.dark;

      if (col.kind === "paper") { base[0] = paper[0]; base[1] = paper[1]; base[2] = paper[2]; }
      else if (col.kind === "map") { const c = ops.gradientMap(ops.posterize(t, col.levels), stops); base[0] = c[0]; base[1] = c[1]; base[2] = c[2]; }
      else {
        const q = ops.posterize(clamp01(t + (col.lift || 0)), col.levels);
        const target = 25 + 230 * q;
        const lum = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i] + 1;
        const sc = target / lum, mix = tint ? (1 - q) * col.shadowAmt : 0;
        const rgb = [R[i] * sc, G[i] * sc, B[i] * sc];
        for (let c = 0; c < 3; c++) {
          let v = target + (rgb[c] - target) * col.sat;
          if (tint) v = v * (1 - mix) + tint[c] * mix;
          base[c] = clamp255(v);
        }
      }

      let shade = 1;
      // el patrón se evalúa en coordenadas de referencia para que la trama escale con la imagen
      if (t0.kind === "hatch") shade = ops.hatch(x / k, y / k, t, t0.gap, t0.layers);
      else if (t0.kind === "dots" && t < t0.below) shade = ops.halftone(x / k, y / k, t / t0.below, t0.cell);
      if (t0.solid && t < t0.solid) shade = 0;
      const v = Math.min(line[i], shade);

      const bgv = 1 - preset.bgInk * (1 - line[i]);
      for (let c = 0; c < 3; c++) {
        person[4 * i + c] = ink[c] + (base[c] - ink[c]) * v;
        if (background) background[4 * i + c] = ink[c] + (bgLayer[4 * i + c] - ink[c]) * bgv;
      }
      person[4 * i + 3] = 255;
      if (background) background[4 * i + 3] = 255;
    }
    return { width: w, height: h, scale: k, person, background, post: preset.post || {} };
  }

  // Fase ligera: mezcla persona/fondo según la máscara (1 = persona) y aplica el post-procesado.
  function composite(layers, mask = null) {
    const { width: w, height: h, person, background } = layers;
    const out = Uint8ClampedArray.from(person);
    if (mask && background) {
      for (let i = 0, n = w * h; i < n; i++) {
        const m = mask[i];
        if (m >= 1) continue;
        const k = 4 * i;
        out[k] = person[k] * m + background[k] * (1 - m);
        out[k + 1] = person[k + 1] * m + background[k + 1] * (1 - m);
        out[k + 2] = person[k + 2] * m + background[k + 2] * (1 - m);
      }
    }
    postProcess(out, w, h, layers.post, layers.scale || 1);
    return out;
  }

  /** Atajo de las dos fases. `bg` = {mask, bgLayer} o null. */
  function render(image, preset, adj = {}, bg = null) {
    return composite(renderLayers(image, preset, adj, bg ? bg.bgLayer : null), bg ? bg.mask : null);
  }

  function postProcess(px, w, h, post, scale) {
    if (post.aberration) {
      const a = Math.round(post.aberration * scale), copy = Uint8ClampedArray.from(px);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = 4 * (y * w + x);
        px[i] = copy[4 * (y * w + Math.min(w - 1, x + a))];
        px[i + 2] = copy[4 * (y * w + Math.max(0, x - a)) + 2];
      }
    }
    if (post.scanlines) {
      for (let y = 0; y < h; y++) {
        if (Math.floor(y / scale) % 3 !== 0) continue;
        for (let x = 0; x < w; x++) {
          const i = 4 * (y * w + x);
          for (let c = 0; c < 3; c++) px[i + c] *= 1 - post.scanlines;
        }
      }
    }
    if (post.grain) {
      const rng = ops.mulberry32(42), g = post.grain * 255;
      for (let i = 0; i < w * h; i++) {
        const d = (rng() - 0.5) * g;
        for (let c = 0; c < 3; c++) px[4 * i + c] += d;
      }
    }
  }

  return { render, renderLayers, composite, effective, REFERENCE_SIDE };
});
