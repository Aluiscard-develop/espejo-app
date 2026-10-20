// Pestaña "Estilo": test → 3 estilos de ropa con conjuntos dibujados en los colores de tu paleta.
(function () {
  "use strict";
  const { estilo, dibujos, color, app } = window.FA;
  const { $, el, pic } = app;
  const answers = {};
  const rep = $("report-estilo");

  app.quiz($("estilo-quiz"), estilo.QUIZ, answers, render);

  function render() {
    rep.replaceChildren();
    const prof = app.profile.color;
    const seasonId = prof ? prof.season.id : "otono-suave";
    const r = estilo.recommend(answers, seasonId, prof ? prof.traits.contrast : null);
    app.profile.estilo = r;
    app.emit("profile", "estilo");
    if (!Object.values(answers).some(Boolean)) el("p", "Responde las preguntas de la izquierda y los estilos se ordenan para ti.", rep, "empty");
    el("p", prof ? `Conjuntos pintados con tu paleta: ${prof.season.name}.` : `Conjuntos pintados con una paleta de ejemplo (${color.SEASONS[seasonId].name}). Haz la pestaña «Color» para usar la tuya.`, rep, "hint");

    r.styles.forEach((s, i) => {
      const card = el("article", "", rep, "style-card");
      const head = el("div", "", card, "style-head");
      el("span", ["🥇", "🥈", "🥉"][i], head, "medal").setAttribute("aria-hidden", "true");
      el("h2", s.name, head);
      el("p", s.desc, card);
      const looks = el("div", "", card, "looks");
      for (const o of s.outfits) {
        const fig = el("figure", "", looks, "look");
        pic(dibujos.outfit(o, `${s.name}: ${o.label}`), fig);
        el("figcaption", o.label, fig);
      }
      const cols = el("div", "", card, "two-cols");
      const k = el("div", "", cols);
      el("h4", "✔ Prendas clave", k);
      const ul = el("ul", "", k);
      for (const t of s.keys) el("li", t, ul);
      const a = el("div", "", cols);
      el("h4", "✖ Evita", a);
      const ul2 = el("ul", "", a);
      for (const t of s.avoid) el("li", t, ul2);
    });

    el("h3", "📐 Reglas para tu cuerpo y tu contraste", rep, "sec-title");
    const tips = el("ul", "", rep, "tips");
    for (const t of r.tips) el("li", t, tips);
  }

  app.on("tab", (t) => { if (t === "estilo") render(); });
  app.on("profile", (k) => { if (k === "color" && app.tab === "estilo") render(); });
  render();
})();
