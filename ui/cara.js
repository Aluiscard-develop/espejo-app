// Pestaña "Cara": 8 puntos sobre la foto → forma de la cara → cortes, barbas y gafas con su dibujo.
(function () {
  "use strict";
  const { asesor, dibujos, app } = window.FA;
  const { $, el, pic } = app;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const marks = $("marks");
  const PAIRS = [["top", "chin"], ["foreL", "foreR"], ["cheekL", "cheekR"], ["jawL", "jawR"]];
  const CONTOURS = [["cheekL", "jawL", "chin"], ["cheekR", "jawR", "chin"]];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const advisor = { points: null, drag: null, frame: 0 }; // puntos relativos (0..1) a la foto

  for (const p of asesor.POINTS) {
    const li = document.createElement("li");
    li.append(Object.assign(document.createElement("b"), { textContent: p.label }), `: ${p.hint}`);
    $("point-list").appendChild(li);
  }

  function svg(name, attrs, parent) {
    const n = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    parent.appendChild(n);
    return n;
  }

  // Posiciones iniciales a partir de la piel detectada.
  function placeDefaults() {
    const { width: w, height: h } = app.source;
    const px = asesor.defaultPoints(w, h, app.getFaceBox());
    advisor.points = {};
    for (const [id, [x, y]] of Object.entries(px)) advisor.points[id] = [clamp01(x / w), clamp01(y / h)];
  }

  function pointsInPixels() {
    const { width: w, height: h } = app.source, px = {};
    for (const [id, [u, v]] of Object.entries(advisor.points)) px[id] = [u * w, v * h];
    return px;
  }

  function buildMarks() {
    const { width: w, height: h } = app.source;
    marks.replaceChildren();
    marks.setAttribute("viewBox", `0 0 ${w} ${h}`);
    marks.setAttribute("preserveAspectRatio", "none");
    for (const [a, b] of PAIRS) svg("line", { class: "measure", "data-a": a, "data-b": b }, marks);
    for (const ids of CONTOURS) svg("polyline", { class: "contour", "data-ids": ids.join(" ") }, marks);
    for (const p of asesor.POINTS) {
      const g = svg("g", { class: "mark", tabindex: "0", role: "button", "data-id": p.id, "aria-label": `${p.label}: ${p.hint}. Muévelo con las flechas.` }, marks);
      svg("circle", { class: "hit" }, g);
      svg("circle", { class: "dot" }, g);
      svg("text", {}, g).textContent = p.label;
    }
  }

  function drawMarks() {
    const px = pointsInPixels();
    const k = app.source.width / (marks.getBoundingClientRect().width || app.source.width); // px de foto por px de pantalla
    for (const l of marks.querySelectorAll("line")) {
      const [x1, y1] = px[l.dataset.a], [x2, y2] = px[l.dataset.b];
      Object.entries({ x1, y1, x2, y2 }).forEach(([a, v]) => l.setAttribute(a, v));
    }
    for (const c of marks.querySelectorAll("polyline")) c.setAttribute("points", c.dataset.ids.split(" ").map((id) => px[id].join(",")).join(" "));
    for (const g of marks.querySelectorAll(".mark")) {
      const [x, y] = px[g.dataset.id];
      g.setAttribute("transform", `translate(${x} ${y})`);
      g.querySelector(".dot").setAttribute("r", 6 * k);
      g.querySelector(".hit").setAttribute("r", 18 * k);
      const t = g.querySelector("text");
      const left = advisor.points[g.dataset.id][0] < 0.5;
      t.setAttribute("x", (left ? -10 : 10) * k);
      t.setAttribute("y", -10 * k);
      t.setAttribute("text-anchor", left ? "end" : "start");
      t.setAttribute("font-size", 13 * k);
    }
  }

  // Rejilla de tarjetas con dibujo: ✔ las que favorecen, ✖ las que no.
  function picGrid(parent, items, kind, draw, bad = false) {
    const grid = el("div", "", parent, "pic-grid" + (bad ? " bad" : ""));
    for (const it of items) {
      const title = typeof it === "string" ? it : it.title;
      const card = el("figure", "", grid, "pic-card");
      const icon = dibujos.iconFor(kind, title);
      if (icon) pic(draw(icon, title), card);
      const cap = el("figcaption", "", card);
      el("span", bad ? "✖" : "✔", cap, bad ? "mark-bad" : "mark-good").setAttribute("aria-hidden", "true");
      el("b", title, cap);
      if (typeof it !== "string" && it.why) el("small", it.why, cap);
    }
  }

  function renderReport() {
    const rep = $("report-cara");
    rep.replaceChildren();
    const r = asesor.advise(pointsInPixels(), { hair: $("hair").value, beard: +$("beard").value, receding: $("receding").checked });
    app.profile.facePoints = pointsInPixels();
    if (!r) { el("p", "Los puntos están amontonados: sepáralos para poder medir.", rep, "hint"); return; }
    app.profile.face = r;
    app.emit("profile", "face");

    const hero = el("div", "", rep, "hero");
    pic(dibujos.faceShape(r.shape.id, `Forma ${r.shape.name}`), hero, "hero-pic");
    const txt = el("div", "", hero);
    const head = el("h2", `Tu cara: ${r.shape.name}`, txt);
    if (r.close) el("small", ` · también se parece a ${r.close.name}`, head);
    el("p", r.shape.desc, txt);
    const goal = el("p", "", txt, "goal");
    el("b", "Objetivo: ", goal);
    goal.append(r.shape.goal);
    const bars = el("div", "", txt, "bars");
    for (const s of r.ranking.slice(0, 3)) {
      const row = el("div", "", bars, "bar-row");
      el("span", s.name, row);
      const bar = el("span", "", row, "bar");
      el("i", "", bar).style.setProperty("width", `${Math.round(s.pct)}%`);
      el("span", `${Math.round(s.pct)} %`, row, "pct");
    }

    const section = (title, good, bad, kind, draw, extra) => {
      el("h3", title, rep, "sec-title");
      picGrid(rep, good, kind, draw);
      if (extra) extra();
      el("h4", "Mejor evita", rep, "avoid-title");
      picGrid(rep, bad, kind, draw, true);
    };
    section("💇 Cortes de pelo", r.cuts, r.cutsAvoid, "cut", dibujos.haircut);
    section("🧔 Barba", r.beards, r.beardsAvoid, "beard", dibujos.beard, () => {
      if (!r.beardsLater.length) return;
      el("h4", "Cuando la barba salga más poblada", rep, "later-title");
      picGrid(rep, r.beardsLater, "beard", dibujos.beard);
    });
    section("👓 Gafas", r.glasses, r.glassesAvoid, "glasses", (id, t) => dibujos.glasses(id, t));

    const tips = el("ul", "", rep, "tips");
    for (const t of r.tips) el("li", t, tips);
    const m = r.measures;
    el("p", `Medidas: largo ÷ ancho ${m.ratio.toFixed(2)} · frente ÷ pómulos ${m.forehead.toFixed(2)} · mandíbula ÷ pómulos ${m.jaw.toFixed(2)} · ángulo de mandíbula ${Math.round(m.jawAngle)}°`, rep, "measures");
    el("p", "Orientativo: son las reglas habituales de barberos y ópticas (visagismo). Si dudas entre dos formas, mira las recomendaciones de ambas. Enséñale los dibujos a tu barbero.", rep, "hint");
  }

  function requestAdvice() {
    if (advisor.frame) return;
    advisor.frame = requestAnimationFrame(() => {
      advisor.frame = 0;
      if (app.tab !== "cara" || !app.source) return;
      drawMarks();
      renderReport();
    });
  }

  function show() {
    const on = app.tab === "cara" && !!app.source && !app.camera.stream;
    marks.toggleAttribute("hidden", !on); // SVGElement no tiene la propiedad `hidden`
    $("advisor-box").disabled = !app.source;
    if (!app.source && app.tab === "cara") {
      const rep = $("report-cara");
      rep.replaceChildren();
      el("p", "Primero sube o toma una foto de frente en «Mi foto».", rep, "empty");
    }
    if (!on) return;
    if (!advisor.points) placeDefaults();
    buildMarks();
    requestAdvice();
  }

  marks.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".mark");
    if (!g || e.button > 0) return;
    e.preventDefault();
    marks.setPointerCapture(e.pointerId);
    advisor.drag = g.dataset.id;
    g.focus();
  });
  marks.addEventListener("pointermove", (e) => {
    if (!advisor.drag) return;
    const r = marks.getBoundingClientRect();
    advisor.points[advisor.drag] = [clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height)];
    requestAdvice();
  });
  const endDrag = () => { advisor.drag = null; };
  marks.addEventListener("pointerup", endDrag);
  marks.addEventListener("pointercancel", endDrag);
  marks.addEventListener("keydown", (e) => {
    const g = e.target.closest(".mark");
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!g || !dir) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.02 : 0.004, p = advisor.points[g.dataset.id];
    advisor.points[g.dataset.id] = [clamp01(p[0] + dir[0] * step), clamp01(p[1] + dir[1] * step)];
    requestAdvice();
  });
  $("advisor-reset").addEventListener("click", () => { if (app.source) { placeDefaults(); requestAdvice(); } });
  for (const id of ["hair", "beard", "receding"]) $(id).addEventListener("change", requestAdvice);
  window.addEventListener("resize", () => { if (app.tab === "cara") requestAdvice(); });

  app.on("photo", () => { advisor.points = null; app.profile.face = null; show(); });
  app.on("tab", show);
  app.on("camera", show);
})();
