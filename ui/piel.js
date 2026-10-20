// Pestaña "Piel": test → rutina de mañana y noche con nivel de evidencia y fuentes de cada paso.
(function () {
  "use strict";
  const { piel, app } = window.FA;
  const { $, el } = app;
  const answers = {}, concerns = new Set();
  const rep = $("report-piel");

  app.quiz($("piel-quiz"), piel.QUIZ, answers, render);
  for (const c of piel.CONCERNS) {
    const b = el("button", c.label, $("piel-concerns"));
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      if (concerns.has(c.id)) concerns.delete(c.id); else concerns.add(c.id);
      b.setAttribute("aria-pressed", String(concerns.has(c.id)));
      render();
    });
  }

  function badge(level, parent) {
    const b = el("span", `${level} · ${piel.LEVELS[level].label}`, parent, `level level-${level}`);
    b.title = piel.LEVELS[level].desc;
    return b;
  }

  function stepCard(parent, s, n) {
    const card = el("article", "", parent, "step-card");
    const head = el("div", "", card, "step-head");
    el("span", String(n), head, "step-n");
    el("h4", s.name, head);
    badge(s.level, head);
    el("p", s.what, card);
    const facts = el("dl", "", card, "facts");
    const fact = (k, v) => { el("dt", k, facts); el("dd", v, facts); };
    fact("Cómo", s.how);
    fact("Cuándo se nota", s.when);
    fact("Ojo", s.caution);
    const prods = el("div", "", card, "products");
    el("b", "Ejemplos: ", prods);
    prods.append(s.products.join(" · "));
    const src = el("details", "", card, "sources");
    el("summary", `Estudios (${s.sources.length})`, src);
    for (const x of s.sources) {
      const p = el("p", "", src);
      el("span", x.finding + " ", p);
      const a = el("a", x.cite, p);
      a.href = x.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  }

  function render() {
    rep.replaceChildren();
    const r = piel.routine(answers, [...concerns]);
    app.profile.piel = r;
    app.emit("profile", "piel");
    if (!Object.values(answers).some(Boolean) && !concerns.size) el("p", "Esta es la rutina básica que le sirve a casi todo el mundo. Responde a la izquierda para ajustarla.", rep, "empty");
    const cols = el("div", "", rep, "routine");
    const col = (title, steps) => {
      const c = el("section", "", cols, "routine-col");
      el("h2", title, c);
      steps.forEach((s, i) => stepCard(c, s, i + 1));
    };
    col("☀️ Mañana", r.am);
    col("🌙 Noche", r.pm);

    el("h3", "💡 Cómo usarla", rep, "sec-title");
    const tips = el("ul", "", rep, "tips");
    for (const t of r.notes) el("li", t, tips);

    el("h3", "💸 No gastes en esto", rep, "sec-title");
    const skip = el("div", "", rep, "skip");
    for (const s of r.skip) {
      const c = el("article", "", skip, "skip-card");
      el("h4", "✖ " + s.name, c);
      el("p", s.why, c);
    }
    const legend = el("div", "", rep, "legend");
    for (const k of Object.keys(piel.LEVELS)) { const p = el("p", "", legend); badge(k, p); p.append(" " + piel.LEVELS[k].desc); }
    el("p", "Los productos son ejemplos que contienen el ingrediente en la concentración estudiada; la evidencia es del ingrediente, no de la marca. Comprueba qué se vende en tu país. No es consejo médico: granos dolorosos, manchas que cambian o rojez persistente → dermatólogo.", rep, "hint");
  }

  render();
})();
