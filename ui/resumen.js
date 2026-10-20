// Pestaña "Resumen": todo el perfil en una ficha; se guarda imprimiéndola como PDF (nada se almacena).
(function () {
  "use strict";
  const { dibujos, app } = window.FA;
  const { $, el, pic, swatch } = app;
  const rep = $("report-resumen");

  function pending(parent, text, tab) {
    const b = el("button", `${text} →`, parent, "pending");
    b.type = "button";
    b.addEventListener("click", () => app.selectTab(tab));
  }

  function render() {
    rep.replaceChildren();
    const { color: c, face: f, estilo: e, piel: p } = app.profile;
    el("h2", "⭐ Tu ficha de imagen", rep);
    const grid = el("div", "", rep, "summary");

    const col = el("article", "", grid, "sum-card");
    el("h3", "🎨 Color", col);
    if (c) {
      el("p", `${c.season.name} · subtono ${c.traits.undertone.toLowerCase()}, ${c.traits.depth.toLowerCase()}, ${c.traits.clarity.toLowerCase()}`, col, "big");
      const strip = el("div", "", col, "strip");
      for (const hex of c.season.best) swatch(hex, strip, hex, "strip-cell");
      el("p", "Neutros", col, "kicker");
      const n = el("div", "", col, "strip small");
      for (const hex of c.season.neutrals) swatch(hex, n, hex, "strip-cell");
      el("p", "Evitar cerca de la cara", col, "kicker");
      const a = el("div", "", col, "strip small avoid");
      for (const hex of c.season.avoid) swatch(hex, a, hex, "strip-cell");
      el("p", `💍 ${c.jewelry.main} · ${c.jewelry.finish.toLowerCase()}`, col);
      el("p", `👓 Monturas: ${c.jewelry.frames.join(", ")}`, col);
    } else pending(col, "Haz la colorimetría", "color");

    const fc = el("article", "", grid, "sum-card");
    el("h3", "💈 Cara", fc);
    if (f) {
      el("p", `Cara ${f.shape.name.toLowerCase()}`, fc, "big");
      const row = el("div", "", fc, "sum-pics");
      const add = (svg, cap) => { const fig = el("figure", "", row); pic(svg, fig); el("figcaption", cap, fig); };
      for (const cut of f.cuts.slice(0, 2)) { const id = dibujos.iconFor("cut", cut.title); if (id) add(dibujos.haircut(id, cut.title), cut.title); }
      const b = f.beards[0]; if (b) { const id = dibujos.iconFor("beard", b.title); if (id) add(dibujos.beard(id, b.title), b.title); }
      const g = f.glasses[0]; if (g) { const id = dibujos.iconFor("glasses", g.title); if (id) add(dibujos.glasses(id, g.title), g.title); }
      el("p", `✖ Evita: ${f.cutsAvoid[0]}`, fc, "hint");
    } else pending(fc, "Marca tu cara", "cara");

    const sc = el("article", "", grid, "sum-card");
    el("h3", "👔 Estilo", sc);
    if (e) {
      el("p", e.styles.map((s) => s.name).join(" · "), sc, "big");
      const row = el("div", "", sc, "sum-pics");
      for (const s of e.styles.slice(0, 3)) { const fig = el("figure", "", row); pic(dibujos.outfit(s.outfits[0], s.name), fig); el("figcaption", s.name, fig); }
      el("p", e.tips[0], sc, "hint");
    } else pending(sc, "Elige tu estilo", "estilo");

    const pc = el("article", "", grid, "sum-card");
    el("h3", "🧴 Piel", pc);
    if (p) {
      const two = el("div", "", pc, "two-cols");
      const list = (title, steps) => { const d = el("div", "", two); el("h4", title, d); const ol = el("ol", "", d); for (const s of steps) el("li", `${s.name} (${s.level})`, ol); };
      list("☀️ Mañana", p.am);
      list("🌙 Noche", p.pm);
    } else pending(pc, "Arma tu rutina", "piel");

    el("p", "Generado en tu dispositivo con Espejo. Orientativo: reglas de asesoría de imagen; skincare con estudios citados en la app. No es consejo médico.", rep, "hint");
  }

  $("print").addEventListener("click", () => { render(); window.print(); });
  app.on("tab", (t) => { if (t === "resumen") render(); });
})();
