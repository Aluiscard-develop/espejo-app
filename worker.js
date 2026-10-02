// Procesado en segundo plano (solo en modo servidor: `npm start`). La interfaz no se congela.
// La CSP que envía el servidor también aplica aquí: el Worker tampoco puede usar la red.
"use strict";
importScripts("core/ops.js", "core/mask.js", "core/styles.js", "core/backgrounds.js", "core/render.js", "core/pipeline.js");
const { pipeline, styles, backgrounds, ops } = self.FA;

let source = null;
const cache = new Map();

function drawBackground(w, h, bgId, anchor) {
  const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
  backgrounds.BACKGROUNDS[bgId](ctx, w, h, anchor, ops.mulberry32(7));
  return ctx.getImageData(0, 0, w, h).data;
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "source") {
    source = msg.source;
    cache.clear();
    return;
  }
  if (msg.type !== "render") return;
  try {
    if (!source) throw new Error("no hay foto cargada");
    const t = performance.now();
    const { layers, auto } = pipeline.run({
      source, preset: styles.byId(msg.presetId), adj: msg.adj, tolerance: msg.tolerance, cache, drawBackground,
    });
    // la máscara se copia: la original se queda en la caché del worker
    const mask = auto ? Float32Array.from(auto.mask) : null;
    const transfer = [layers.person.buffer];
    if (layers.background) transfer.push(layers.background.buffer);
    if (mask) transfer.push(mask.buffer);
    self.postMessage({ type: "layers", id: msg.id, layers, auto: auto && { mask, anchor: auto.anchor }, ms: performance.now() - t }, transfer);
  } catch (err) {
    self.postMessage({ type: "error", id: msg.id, message: err.message });
  }
};
