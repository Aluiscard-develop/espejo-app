// Estilos declarativos. Añadir uno = añadir un objeto aquí + (opcional) un fondo en backgrounds.js.
// Son "inspirados en": sin logos, personajes ni textos oficiales.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).styles = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const HATCH_FULL = [{ axis: "d1", th: 0.55 }, { axis: "d2", th: 0.4 }, { axis: "h", th: 0.27 }];

  const PRESETS = [
    {
      id: "berserk", name: "Berserk", hint: "Tinta y tramado cruzado bajo un eclipse",
      line: { sigma: 1.3, tau: 0.975, phi: 260, thick: 0 },
      tone: { kind: "hatch", dark: 0.06, gap: 5, layers: HATCH_FULL, solid: 0.14 },
      color: { kind: "paper", paper: "#e9dfcf" },
      ink: "#100b0b", bg: "eclipse", bgInk: 0.35, post: { grain: 0.04 },
    },
    {
      id: "hellsing", name: "Hellsing", hint: "Rojo sangre, negro absoluto, luna carmesí",
      line: { sigma: 1.6, tau: 0.97, phi: 200, thick: 1 },
      tone: { kind: "none", dark: 0.04, solid: 0.2 },
      color: { kind: "map", levels: 4, stops: ["#0a0303", "#6d0710", "#c8141c", "#f5eadf"] },
      ink: "#050202", bg: "bloodMoon", bgInk: 0.2, post: { grain: 0.05 },
    },
    {
      id: "jojo", name: "JoJo", hint: "Paleta imposible, sombras duras y ゴゴゴ",
      line: { sigma: 1.4, tau: 0.97, phi: 220, thick: 1 },
      tone: { kind: "hatch", dark: 0.02, gap: 4, layers: [{ axis: "d2", th: 0.35 }, { axis: "d1", th: 0.22 }], solid: 0.12 },
      color: { kind: "map", levels: 5, stops: ["#2a0a4a", "#7b2ea0", "#e0457b", "#ffd23f", "#fff4c9"] },
      ink: "#12051c", bg: "menacing", bgInk: 0.15, post: {},
    },
    {
      id: "gundam", name: "Gundam", hint: "Cel de los 80–90, sombras azuladas y HUD",
      line: { sigma: 1.2, tau: 0.978, phi: 260, thick: 0 },
      tone: { kind: "none", dark: 0 },
      color: { kind: "cel", levels: 3, sat: 1.35, lift: 0.05, shadowTint: "#3a3f8f", shadowAmt: 0.35 },
      ink: "#1a1414", bg: "mecha", bgInk: 0.2, post: { scanlines: 0.08, grain: 0.05 },
    },
    {
      id: "eva", name: "Evangelion", hint: "Sombras violetas, hexágonos y tarjeta de título",
      line: { sigma: 1.3, tau: 0.975, phi: 260, thick: 0 },
      tone: { kind: "none", dark: 0 },
      color: { kind: "cel", levels: 3, sat: 1.1, lift: 0, shadowTint: "#4b1f6f", shadowAmt: 0.55 },
      ink: "#0d0a14", bg: "nerv", bgInk: 0.2, post: { grain: 0.03 },
    },
    {
      id: "pns", name: "Panty & Stocking", hint: "Contorno gordo, rosa pop y trama de puntos",
      line: { sigma: 1.8, tau: 0.965, phi: 180, thick: 2 },
      tone: { kind: "dots", dark: 0.08, cell: 7, below: 0.45 },
      color: { kind: "map", levels: 3, stops: ["#ff2e88", "#ffb3d9", "#fffaf5"] },
      ink: "#000000", bg: "popBurst", bgInk: 0.3, post: {},
    },
    {
      id: "onepiece", name: "One Piece", hint: "Color saturado, línea expresiva, sol de verano",
      line: { sigma: 1.5, tau: 0.97, phi: 220, thick: 1 },
      tone: { kind: "none", dark: 0 },
      color: { kind: "cel", levels: 3, sat: 1.6, lift: 0.1, shadowTint: "#7a2b1a", shadowAmt: 0.2 },
      ink: "#1a0f0a", bg: "sunburst", bgInk: 0.2, post: {},
    },
    {
      id: "bocchi", name: "Bocchi the Rock", hint: "Pastel rosa, línea suave, cubos y glitch",
      line: { sigma: 1.1, tau: 0.982, phi: 300, thick: 0 },
      tone: { kind: "none", dark: -0.05 },
      color: { kind: "cel", levels: 4, sat: 0.8, lift: 0.15, shadowTint: "#e2779a", shadowAmt: 0.45 },
      ink: "#3b2a3a", bg: "cubes", bgInk: 0.15, post: { aberration: 2 },
    },
  ];

  const HEX = /^#[0-9a-f]{6}$/i;
  // Devuelve la lista de problemas de un estilo (vacía = válido).
  function validate(p) {
    const errs = [];
    if (!p.id || !p.name) errs.push("falta id/name");
    if (!(p.line && p.line.sigma > 0 && p.line.tau > 0 && p.line.tau < 1)) errs.push("line inválida");
    if (!["hatch", "dots", "none"].includes(p.tone && p.tone.kind)) errs.push("tone.kind inválido");
    if (p.tone && p.tone.kind === "hatch" && !(Array.isArray(p.tone.layers) && p.tone.gap >= 3)) errs.push("hatch sin capas/gap");
    if (!["paper", "map", "cel"].includes(p.color && p.color.kind)) errs.push("color.kind inválido");
    if (p.color && p.color.kind === "map" && !(p.color.stops || []).every((c) => HEX.test(c))) errs.push("stops inválidos");
    for (const c of [p.ink, p.color && p.color.paper, p.color && p.color.shadowTint]) if (c !== undefined && !HEX.test(c)) errs.push("color no hex: " + c);
    if (typeof p.bg !== "string") errs.push("falta bg");
    return errs;
  }

  const byId = (id) => PRESETS.find((p) => p.id === id);
  return { PRESETS, validate, byId };
});
