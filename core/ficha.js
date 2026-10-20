// Ficha de imagen como un único SVG (HU-28): la UI lo dibuja en un canvas y lo exporta a PNG.
// Puro: recibe el perfil calculado por las pestañas y devuelve una cadena.
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./dibujos.js") : root.FA.dibujos);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).ficha = api;
})(typeof self !== "undefined" ? self : this, function (dibujos) {
  "use strict";

  const W = 1200, PAD = 48;
  const INK = "#1d1a16", MUTED = "#6b6257", ACCENT = "#a8741f", CARD = "#f3ece1";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Corte de líneas por número de caracteres (el SVG no ajusta texto solo).
  function wrap(text, max) {
    const out = [];
    let line = "";
    for (const w of String(text).split(/\s+/)) {
      if (line && (line + " " + w).length > max) { out.push(line); line = w; } else line = line ? line + " " + w : w;
    }
    if (line) out.push(line);
    return out;
  }

  function text(x, y, s, { size = 18, weight = 400, fill = INK, anchor = "start", max = 0, lh = 1.3 } = {}) {
    const lines = max ? wrap(s, max) : [String(s)];
    const tspans = lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * lh : 0}">${esc(l)}</tspan>`).join("");
    return { svg: `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="system-ui, sans-serif">${tspans}</text>`, h: lines.length * size * lh };
  }

  // Coloca un pictograma (cadena <svg ...>) en una posición y tamaño.
  const place = (svg, x, y, w, h) => svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);

  function swatches(list, x, y, size, gap, cross = false) {
    return list.map((hex, i) => {
      const cx = x + i * (size + gap);
      return `<rect x="${cx}" y="${y}" width="${size}" height="${size}" rx="8" fill="${hex}" stroke="#0002"/>` +
        (cross ? `<path d="M${cx + size * 0.3},${y + size * 0.3} L${cx + size * 0.7},${y + size * 0.7} M${cx + size * 0.7},${y + size * 0.3} L${cx + size * 0.3},${y + size * 0.7}" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` : "");
    }).join("");
  }

  function section(title, y, h, body) {
    return `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${h}" rx="18" fill="${CARD}"/>` +
      text(PAD + 24, y + 42, title, { size: 26, weight: 700 }).svg + body;
  }

  /**
   * @param {{sexo?:string, makeup?:object, color?:object, face?:object, estilo?:object, piel?:object}} p
   *   app.profile; `makeup` (color.makeup) solo se usa para mujer
   * @returns {{svg:string, width:number, height:number}}
   */
  function build(p) {
    let y = PAD, body = "";
    body += text(PAD, y + 40, "Espejo", { size: 44, weight: 800 }).svg;
    body += text(PAD + 175, y + 40, "tu ficha de imagen", { size: 22, fill: ACCENT }).svg;
    y += 80;

    if (p.color) {
      const c = p.color, j = c.jewelry, mk = p.sexo === "mujer" ? p.makeup : null, h = mk ? 432 : 400, x = PAD + 24;
      let b = text(x, y + 82, `${c.season.name} · subtono ${c.traits.undertone.toLowerCase()}, ${c.traits.depth.toLowerCase()}, intensidad ${c.traits.clarity.toLowerCase()}`, { size: 20, weight: 600 }).svg;
      b += text(x, y + 120, "Tus mejores colores", { size: 15, fill: MUTED }).svg + swatches(c.season.best, x, y + 132, 70, 14);
      b += text(x, y + 236, "Neutros", { size: 15, fill: MUTED }).svg + swatches(c.season.neutrals, x, y + 248, 52, 10);
      b += text(x + 520, y + 236, "Evitar cerca de la cara", { size: 15, fill: MUTED }).svg + swatches(c.season.avoid, x + 520, y + 248, 52, 10, true);
      b += text(x, y + 340, `Joyería: ${j.main} · ${j.finish}`, { size: 18, max: 95 }).svg;
      b += text(x, y + 372, `Monturas: ${j.frames.join(", ")}`, { size: 18 }).svg;
      if (mk) b += text(x, y + 404, `Maquillaje: labios ${mk.lips.map(([n]) => n.toLowerCase()).join(", ")} · colorete ${mk.blush.map(([n]) => n.toLowerCase()).join(", ")}`, { size: 18, max: 95 }).svg;
      body += section("🎨 Color", y, h, b);
      y += h + 24;
    }

    if (p.face) {
      const f = p.face, h = 330, x = PAD + 24;
      let b = place(dibujos.faceShape(f.shape.id, f.shape.name), x, y + 64, 150, 180);
      b += text(x + 75, y + 270, `Cara ${f.shape.name.toLowerCase()}`, { size: 17, weight: 600, anchor: "middle" }).svg;
      const fem = f.sexo === "mujer", items = [];
      for (const cut of f.cuts.slice(0, 2)) items.push([fem ? "cutF" : "cut", cut.title, dibujos.haircut]);
      if (f.beards[0]) items.push(["beard", f.beards[0].title, dibujos.beard]);
      const metal = p.color ? p.color.jewelry.swatch[0] : undefined;
      if (f.earrings && f.earrings[0]) items.push(["earring", f.earrings[0].title, (id, t) => dibujos.earring(id, t, metal)]);
      if (f.glasses[0]) items.push(["glasses", f.glasses[0].title, (id, t) => dibujos.glasses(id, t)]);
      items.forEach(([kind, title, draw], i) => {
        const id = dibujos.iconFor(kind, title), cx = x + 210 + i * 230;
        if (!id) return;
        b += `<rect x="${cx}" y="${y + 64}" width="200" height="180" rx="12" fill="#fff"/>`;
        b += kind === "glasses" ? place(draw(id, title), cx + 10, y + 110, 180, 75) : place(draw(id, title), cx + 25, y + 66, 150, 176);
        b += text(cx + 100, y + 270, title, { size: 15, anchor: "middle", max: 26 }).svg;
      });
      body += section(fem ? "💈 Cara: cortes, pendientes y gafas" : "💈 Cara: cortes, barba y gafas", y, h, b);
      y += h + 24;
    }

    if (p.estilo) {
      const e = p.estilo, h = 330, x = PAD + 24;
      let b = "";
      e.styles.forEach((s, i) => {
        const cx = x + i * 360;
        b += `<rect x="${cx}" y="${y + 60}" width="120" height="216" rx="12" fill="#fff"/>` + place(dibujos.outfit(s.outfits[0], s.name), cx + 5, y + 64, 110, 208);
        b += text(cx + 136, y + 96, `${i + 1}. ${s.name}`, { size: 19, weight: 700, max: 18 }).svg;
        b += text(cx + 136, y + 150, s.keys.slice(0, 3).join(" · "), { size: 14, fill: MUTED, max: 26 }).svg;
      });
      b += text(x, y + 306, e.tips[0], { size: 15, fill: MUTED, max: 130 }).svg;
      body += section("👔 Estilo", y, h, b);
      y += h + 24;
    }

    if (p.piel) {
      const r = p.piel, rows = Math.max(r.am.length, r.pm.length), h = 110 + rows * 34, x = PAD + 24;
      let b = text(x, y + 82, "☀️ Mañana", { size: 18, weight: 700 }).svg + text(x + 560, y + 82, "🌙 Noche", { size: 18, weight: 700 }).svg;
      r.am.forEach((s, i) => { b += text(x, y + 116 + i * 34, `${i + 1}. ${s.name} (${s.level})`, { size: 16 }).svg; });
      r.pm.forEach((s, i) => { b += text(x + 560, y + 116 + i * 34, `${i + 1}. ${s.name} (${s.level})`, { size: 16 }).svg; });
      body += section("🧴 Piel", y, h, b);
      y += h + 24;
    }

    if (y === PAD + 80) body += text(PAD, y + 30, "Completa al menos una pestaña (Color, Cara, Estilo o Piel) para generar tu ficha.", { size: 20, fill: MUTED }).svg, y += 60;
    body += text(PAD, y + 20, "Orientativo: reglas de asesoría de imagen. Skincare: nivel de evidencia entre paréntesis (A fuerte, B moderada). No es consejo médico.", { size: 13, fill: MUTED }).svg;
    const height = Math.round(y + 50);
    return {
      width: W, height,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}"><rect width="100%" height="100%" fill="#fffdf9"/>${body}</svg>`,
    };
  }

  return { build, wrap };
});
