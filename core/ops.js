// Operaciones de imagen puras sobre arrays planos. Sin DOM: se usan igual en el navegador y en Node.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).ops = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  function gaussianBlur(src, w, h, sigma) {
    if (!(sigma > 0)) return Float32Array.from(src);
    const r = Math.max(1, Math.ceil(sigma * 3));
    const k = new Float32Array(2 * r + 1);
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
    for (let i = 0; i < k.length; i++) k[i] /= sum;
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        let a = 0;
        for (let i = -r; i <= r; i++) {
          let xx = x + i;
          if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1;
          a += k[i + r] * src[row + xx];
        }
        tmp[row + x] = a;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let a = 0;
        for (let i = -r; i <= r; i++) {
          let yy = y + i;
          if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1;
          a += k[i + r] * tmp[yy * w + x];
        }
        dst[y * w + x] = a;
      }
    }
    return dst;
  }

  // RGBA (0..255) → luminancia 0..1
  function luminance(rgba, n) {
    const g = new Float32Array(n);
    for (let i = 0; i < n; i++) g[i] = (0.299 * rgba[4 * i] + 0.587 * rgba[4 * i + 1] + 0.114 * rgba[4 * i + 2]) / 255;
    return g;
  }

  // Estira el contraste entre dos percentiles; imagen plana → sin cambios.
  function stretchContrast(gray, loP = 0.02, hiP = 0.98) {
    const n = gray.length;
    const sorted = Float32Array.from(gray).sort();
    const lo = sorted[Math.floor((n - 1) * loP)];
    const hi = sorted[Math.floor((n - 1) * hiP)];
    if (hi - lo < 1e-6) return Float32Array.from(gray);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = clamp01((gray[i] - lo) / (hi - lo));
    return out;
  }

  // XDoG: 1 = papel, 0 = tinta.
  function xdog(gray, w, h, { sigma = 1.2, k = 1.6, tau = 0.975, phi = 260 } = {}) {
    const g1 = gaussianBlur(gray, w, h, sigma);
    const g2 = gaussianBlur(gray, w, h, sigma * k);
    const out = new Float32Array(w * h);
    for (let i = 0; i < out.length; i++) {
      const d = g1[i] - tau * g2[i];
      out[i] = d >= 0 ? 1 : clamp01(1 + Math.tanh(phi * d));
    }
    return out;
  }

  // Filtro mínimo separable: engrosa el trazo oscuro `radius` píxeles.
  function thicken(v, w, h, radius) {
    const r = Math.round(radius);
    if (r <= 0) return Float32Array.from(v);
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = 1;
        for (let i = Math.max(0, x - r), e = Math.min(w - 1, x + r); i <= e; i++) if (v[y * w + i] < m) m = v[y * w + i];
        tmp[y * w + x] = m;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = 1;
        for (let i = Math.max(0, y - r), e = Math.min(h - 1, y + r); i <= e; i++) if (tmp[i * w + x] < m) m = tmp[i * w + x];
        out[y * w + x] = m;
      }
    }
    return out;
  }

  // Tramado: cada capa añade un ángulo de líneas cuando el tono baja de su umbral. 0 = tinta.
  const HATCH_AXES = { d1: (x, y) => x + y, d2: (x, y) => x - y, h: (x, y) => y, v: (x, y) => x };
  function hatch(x, y, t, gap, layers) {
    const wob = Math.sin(y * 0.012 + x * 0.004) * 0.8;
    for (const layer of layers) {
      if (t >= layer.th) continue;
      const a = HATCH_AXES[layer.axis](x, y) + wob;
      const p = ((a % gap) + gap) % gap;
      if (p < Math.min(gap - 1.5, 1.2 + (layer.th - t) * 2 * (gap / 5))) return 0;
    }
    return 1;
  }

  // Trama de puntos a 45°: el radio del punto crece con la oscuridad. 0 = tinta.
  function halftone(x, y, t, cell) {
    if (t >= 0.97) return 1;
    const u = (x + y) * Math.SQRT1_2;
    const v = (x - y) * Math.SQRT1_2;
    const cu = (((u % cell) + cell) % cell) - cell / 2;
    const cv = (((v % cell) + cell) % cell) - cell / 2;
    const radius = Math.sqrt(1 - clamp01(t)) * cell * 0.72;
    return cu * cu + cv * cv < radius * radius ? 0 : 1;
  }

  function posterize(t, levels) {
    if (levels < 2) return clamp01(t);
    return Math.min(levels - 1, Math.floor(clamp01(t) * levels)) / (levels - 1);
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) throw new Error("Color no válido: " + hex);
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Interpola linealmente entre colores [r,g,b] según t en 0..1.
  function gradientMap(t, stops) {
    const n = stops.length;
    if (n === 1) return stops[0].slice();
    const pos = clamp01(t) * (n - 1);
    const i = Math.min(n - 2, Math.floor(pos));
    const f = pos - i;
    const a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return { clamp01, clamp255, gaussianBlur, luminance, stretchContrast, xdog, thicken, hatch, halftone, posterize, hexToRgb, gradientMap, mulberry32 };
});
