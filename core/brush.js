// Retoques de la máscara con pincel. Los trazos se guardan como lista (deshacer = quitar el último
// y reconstruir), y se aplican sobre una capa con signo: +1 = "es persona", -1 = "es fondo", 0 = sin tocar.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).brush = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const HARDNESS = 0.6; // fracción del radio pintada a plena fuerza; el resto se difumina

  // Empuja la capa hacia `sign` dentro de un círculo de borde suave.
  function stamp(layer, w, h, cx, cy, r, sign) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d >= 1) continue;
      const s = d <= HARDNESS ? 1 : (1 - d) / (1 - HARDNESS);
      const i = y * w + x;
      layer[i] += (sign - layer[i]) * s;
    }
  }

  // Estampa a lo largo de la línea de puntos, sin huecos entre ellos.
  function applyStroke(layer, w, h, { points, radius, sign }) {
    if (!points.length) return;
    const step = Math.max(1, radius * 0.35);
    let [px, py] = points[0];
    stamp(layer, w, h, px, py, radius, sign);
    for (let k = 1; k < points.length; k++) {
      const [x, y] = points[k];
      const dist = Math.hypot(x - px, y - py);
      const n = Math.floor(dist / step);
      for (let j = 1; j <= n; j++) {
        const t = (j * step) / dist;
        stamp(layer, w, h, px + (x - px) * t, py + (y - py) * t, radius, sign);
      }
      if (n * step < dist) stamp(layer, w, h, x, y, radius, sign);
      px = x; py = y;
    }
  }

  function rebuild(strokes, w, h) {
    const layer = new Float32Array(w * h);
    for (const s of strokes) applyStroke(layer, w, h, s);
    return layer;
  }

  // Máscara final = automática corregida por los retoques.
  function applyOverride(auto, layer) {
    const out = new Float32Array(auto.length);
    for (let i = 0; i < auto.length; i++) {
      const a = auto[i], o = layer[i];
      out[i] = o > 0 ? a + (1 - a) * o : a * (1 + o);
    }
    return out;
  }

  return { stamp, applyStroke, rebuild, applyOverride };
});
