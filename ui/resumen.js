// Pestaña "Resumen": todo el perfil en una ficha; se descarga como PNG (HU-28) o se imprime (nada se almacena).
(function () {
  "use strict";
  const { dibujos, ficha, png, color, app } = window.FA;
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
      if (app.profile.sexo === "mujer") el("p", `💄 Labios: ${color.makeup(c.season.id, c.axes).lips.map(([n]) => n.toLowerCase()).join(", ")}`, col);
    } else pending(col, "Haz la colorimetría", "color");

    const fc = el("article", "", grid, "sum-card");
    el("h3", "💈 Cara", fc);
    if (f) {
      el("p", `Cara ${f.shape.name.toLowerCase()}`, fc, "big");
      const row = el("div", "", fc, "sum-pics");
      const add = (svg, cap) => { const fig = el("figure", "", row); pic(svg, fig); el("figcaption", cap, fig); };
      const fem = f.sexo === "mujer";
      for (const cut of f.cuts.slice(0, 2)) { const id = dibujos.iconFor(fem ? "cutF" : "cut", cut.title); if (id) add(dibujos.haircut(id, cut.title), cut.title); }
      const b = f.beards[0]; if (b) { const id = dibujos.iconFor("beard", b.title); if (id) add(dibujos.beard(id, b.title), b.title); }
      const er = f.earrings[0]; if (er) { const id = dibujos.iconFor("earring", er.title); if (id) add(dibujos.earring(id, er.title, c && c.jewelry.swatch[0]), er.title); }
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

  // SVG → imagen → canvas → PNG re-codificado (sin EXIF) con la marca noai.
  $("save-ficha").addEventListener("click", () => {
    const c = app.profile.color;
    const { svg, width, height } = ficha.build({ ...app.profile, makeup: c ? color.makeup(c.season.id, c.axes) : null });
    const img = new Image();
    const src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      URL.revokeObjectURL(src);
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      c.getContext("2d").drawImage(img, 0, 0);
      c.toBlob(async (blob) => {
        if (!blob) { app.setStatus("No se pudo exportar la ficha.", true); return; }
        const bytes = png.addTextChunks(new Uint8Array(await blob.arrayBuffer()), {
          Software: "Espejo", Comment: "noai, noimageai", Disclaimer: "No autorizado para entrenar IA / Not licensed for AI training",
        });
        const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "espejo-ficha.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(src); app.setStatus("No se pudo dibujar la ficha.", true); };
    img.src = src;
  });
  app.on("tab", (t) => { if (t === "resumen") render(); });
})();
