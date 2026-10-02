// Fase pesada completa (máscara automática + fondo + capas). La usan igual el hilo principal
// (modo archivo) y el Worker (modo servidor); solo cambia quién dibuja el fondo.
(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const api = isNode ? factory(require("./mask.js"), require("./render.js")) : factory(root.FA.mask, root.FA.render);
  if (isNode) module.exports = api;
  else (root.FA = root.FA || {}).pipeline = api;
})(typeof self !== "undefined" ? self : this, function (maskLib, renderLib) {
  "use strict";

  /**
   * @param {object} o
   * @param {{data: Uint8ClampedArray, width: number, height: number}} o.source
   * @param {object} o.preset
   * @param {object} o.adj
   * @param {number} o.tolerance  0 = sin fondo
   * @param {Map} o.cache  máscaras automáticas por tolerancia (se vacía al cambiar de foto)
   * @param {(w: number, h: number, bgId: string, anchor: object) => Uint8ClampedArray} o.drawBackground
   */
  function run({ source, preset, adj, tolerance, cache, drawBackground }) {
    let auto = null;
    if (tolerance > 0) {
      auto = cache.get(tolerance);
      if (!auto) {
        auto = maskLib.detect(source.data, source.width, source.height, { tolerance });
        cache.set(tolerance, auto);
      }
    }
    const bgLayer = auto ? drawBackground(source.width, source.height, preset.bg, auto.anchor) : null;
    return { layers: renderLib.renderLayers(source, preset, adj, bgLayer), auto };
  }

  return { run };
});
