// Operaciones de imagen puras sobre arrays planos (las usa la detección de la cara). Sin DOM: igual en el navegador y en Node.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).ops = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

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

  return { clamp01, gaussianBlur, mulberry32 };
});
