// Separación persona/fondo heurística (sin modelos, sin red).
// 1) piel en YCbCr → mayor mancha = cara; 2) zona de cabeza protegida;
// 3) el fondo crece desde los bordes superior/laterales mientras no cruce un borde fuerte.
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./ops.js") : root.FA.ops);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).mask = api;
})(typeof self !== "undefined" ? self : this, function (ops) {
  "use strict";

  function isSkin(r, g, b) {
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return cb >= 77 && cb <= 127 && cr >= 136 && cr <= 173 && r > 60;
  }

  // Mayor componente conexa (4-vecinos) de un mapa binario. Devuelve su caja o null.
  function largestBlob(bin, w, h) {
    const label = new Int32Array(w * h);
    const queue = new Int32Array(w * h);
    let best = null, next = 1;
    for (let s = 0; s < w * h; s++) {
      if (!bin[s] || label[s]) continue;
      let head = 0, tail = 0, count = 0;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, sx = 0;
      label[s] = next; queue[tail++] = s;
      while (head < tail) {
        const p = queue[head++], x = p % w, y = (p / w) | 0;
        count++; sx += x;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
        for (const q of nb) if (q >= 0 && bin[q] && !label[q]) { label[q] = next; queue[tail++] = q; }
      }
      if (!best || count > best.count) best = { count, x0, y0, x1, y1, cx: sx / count };
      next++;
    }
    return best;
  }

  /**
   * @returns {{mask: Float32Array, anchor: {x:number,y:number,r:number}, face: object|null, bgFraction: number}}
   * mask: 1 = persona, 0 = fondo, bordes suavizados.
   */
  function detect(rgba, w, h, { tolerance = 18, sideFraction = 0.55, target = 240 } = {}) {
    const s = Math.max(1, Math.round(Math.max(w, h) / target));
    const sw = Math.max(1, Math.floor(w / s)), sh = Math.max(1, Math.floor(h / s));
    const n = sw * sh;
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      let r = 0, g = 0, b = 0;
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
        const i = 4 * ((y * s + yy) * w + x * s + xx);
        r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2];
      }
      const k = y * sw + x, d = s * s;
      R[k] = r / d; G[k] = g / d; B[k] = b / d;
    }
    const Rb = ops.gaussianBlur(R, sw, sh, 1), Gb = ops.gaussianBlur(G, sw, sh, 1), Bb = ops.gaussianBlur(B, sw, sh, 1);

    // cara
    const skin = new Uint8Array(n);
    for (let k = 0; k < n; k++) skin[k] = isSkin(Rb[k], Gb[k], Bb[k]) ? 1 : 0;
    const blob = largestBlob(skin, sw, sh);
    const face = blob && blob.count > n * 0.01 ? blob : null;

    // zonas: 2 = torso (el fondo nunca entra), 1 = cabeza (solo entra con criterio estricto)
    const zone = new Uint8Array(n);
    if (face) {
      const fw = face.x1 - face.x0 + 1, fh = face.y1 - face.y0 + 1;
      const cx = face.cx, cy = face.y0 + 0.2 * fh, rx = 0.62 * fw, ry = 0.7 * fh;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const k = y * sw + x;
        if (y > face.y1 - 0.1 * fh && Math.abs(x - cx) < fw * 0.6 + (y - face.y1) * 1.0) zone[k] = 2;
        else if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) zone[k] = 1;
      }
    }

    // crecimiento de región desde los bordes. Cada píxel de fondo recuerda el color de su semilla:
    // así un degradado suave no puede "arrastrar" el fondo hasta la silla o el pelo.
    const bg = new Uint8Array(n);
    const origin = new Int32Array(n);
    const queue = new Int32Array(n);
    let tail = 0;
    const seed = (k) => { if (!bg[k] && !zone[k]) { bg[k] = 1; origin[k] = k; queue[tail++] = k; } };
    for (let x = 0; x < sw; x++) seed(x);
    for (let y = 0; y < sh * sideFraction; y++) { seed(y * sw); seed(y * sw + sw - 1); }
    const d2 = (a, b) => (R[a] - R[b]) ** 2 + (G[a] - G[b]) ** 2 + (B[a] - B[b]) ** 2;
    for (let head = 0; head < tail; head++) {
      const p = queue[head], x = p % sw, y = (p / sw) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < sw - 1 ? p + 1 : -1, y > 0 ? p - sw : -1, y < sh - 1 ? p + sw : -1];
      for (const q of nb) {
        if (q < 0 || bg[q] || zone[q] === 2) continue;
        const f = zone[q] === 1 ? 0.5 : 1;
        const step = tolerance * f, far = tolerance * 3.5 * f;
        if (d2(q, p) < step * step && d2(q, origin[p]) < far * far) { bg[q] = 1; origin[q] = origin[p]; queue[tail++] = q; }
      }
    }
    const bgFraction = tail / n;

    // máscara a baja resolución → suavizada → escalada
    let low = new Float32Array(n);
    for (let k = 0; k < n; k++) low[k] = bg[k] ? 0 : 1;
    low = ops.gaussianBlur(low, sw, sh, 1.2);
    const mask = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = Math.min(sh - 1, Math.max(0, (y + 0.5) / s - 0.5)), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < w; x++) {
        const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) / s - 0.5)), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0;
        const a = low[y0 * sw + x0] * (1 - tx) + low[y0 * sw + x1] * tx;
        const b = low[y1 * sw + x0] * (1 - tx) + low[y1 * sw + x1] * tx;
        mask[y * w + x] = ops.clamp01((a * (1 - ty) + b * ty - 0.3) / 0.4);
      }
    }

    const anchor = face
      ? { x: face.cx * s, y: (face.y0 + 0.15 * (face.y1 - face.y0)) * s, r: (face.x1 - face.x0) * s * 0.95 }
      : { x: w / 2, y: h * 0.33, r: w * 0.3 };
    return { mask, anchor, face, bgFraction };
  }

  return { detect, isSkin, largestBlob };
});
