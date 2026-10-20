// Probador «Pelo y barba» (D-22): tinte sobre la máscara de pelo y barba dibujada sobre la malla de la cara.
// Ambos modelos de MediaPipe se cargan solo al entrar en este modo (ui/mp.js).
(function () {
  "use strict";
  const { pelo, color, ops, app } = window.FA;
  const { $, el, swatch } = app;
  const canvas = $("try-canvas"), ctx = canvas.getContext("2d");
  const st = { on: false, season: null, hair: null, beard: "ninguna", mask: null, landmarks: null, busy: false, frame: 0, error: null };

  // ---- controles ----
  function buildColors() {
    const box = $("hair-colors"), fam = color.SEASONS[st.season].family;
    box.replaceChildren();
    const opts = [["Natural", null], ...pelo.HAIR_COLORS[fam]];
    for (const [name, hex] of opts) {
      const b = el("button", "", box);
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(st.hair === hex));
      if (hex) swatch(hex, b, name); else el("span", "🙂", b);
      el("span", name, b);
      b.addEventListener("click", () => { st.hair = hex; buildColors(); paint(); });
    }
  }
  $("hair-custom").addEventListener("input", (e) => { st.hair = e.target.value.toUpperCase(); buildColors(); paint(); });
  $("hair-strength").addEventListener("input", () => paint());
  $("beard-density").addEventListener("input", () => paint());

  for (const b of pelo.BEARDS) {
    const btn = el("button", b.name, $("beard-picker"));
    btn.type = "button";
    btn.setAttribute("role", "radio");
    btn.dataset.id = b.id;
    btn.addEventListener("click", () => {
      st.beard = b.id;
      for (const c of $("beard-picker").children) c.setAttribute("aria-checked", String(c.dataset.id === b.id));
      paint();
    });
  }
  $("beard-picker").firstChild.setAttribute("aria-checked", "true");

  // mantener pulsado para ver la foto original
  const peek = (v) => { canvas.style.setProperty("opacity", v ? "0" : "1"); };
  for (const ev of ["pointerdown", "keydown"]) $("hair-compare").addEventListener(ev, (e) => { if (ev === "keydown" && e.key !== " " && e.key !== "Enter") return; peek(true); });
  for (const ev of ["pointerup", "pointerleave", "pointercancel", "keyup", "blur"]) $("hair-compare").addEventListener(ev, () => peek(false));

  // ---- modelos ----
  async function ensureModels() {
    if (!app.source || st.busy) return;
    const needHair = st.hair && !st.mask, needFace = st.beard !== "ninguna" && !st.landmarks;
    if (!needHair && !needFace) return;
    st.busy = true;
    st.error = null;
    app.setStatus("Cargando el modelo (unos segundos la primera vez)…");
    try {
      if (needHair) st.mask = await app.mp.hairMask();
      if (needFace) st.landmarks = await app.mp.faceLandmarks();
      app.setStatus(st.beard !== "ninguna" && !st.landmarks ? "No encontré tu cara para dibujar la barba. Usa una foto de frente." : "");
    } catch (err) {
      st.error = err.message;
      app.setStatus("No se pudo usar el modelo: " + err.message, true);
    } finally {
      st.busy = false;
    }
  }

  // ---- dibujo ----
  function beardColor() {
    if (st.hair) return color.hexToRgb(st.hair);
    return app.profile.hairRgb || [43, 29, 20];
  }

  function polyPath(shapes) {
    const p = new Path2D();
    for (const poly of [...shapes.fill, ...shapes.holes]) {
      poly.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
    }
    return p;
  }

  // Barba: base translúcida + pelos cortos hacia abajo (o puntos para la de 3 días), bordes suavizados.
  function drawBeard(shapes, rgb, density) {
    const { width: w, height: h } = canvas;
    const path = polyPath(shapes);
    const faceW = Math.hypot(st.landmarks[454].x * w - st.landmarks[234].x * w, st.landmarks[454].y * h - st.landmarks[234].y * h);
    const layer = document.createElement("canvas");
    layer.width = w; layer.height = h;
    const g = layer.getContext("2d");
    g.save();
    g.clip(path, "evenodd");
    const rnd = ops.mulberry32(11);
    const [r, gg, b] = rgb;
    const xs = shapes.fill[0].map((p) => p[0]), ys = shapes.fill[0].map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const areaPx = (x1 - x0) * (y1 - y0);
    if (st.beard === "stubble") {
      const n = Math.round(areaPx / 9 * density), s = Math.max(1, faceW * 0.004);
      for (let i = 0; i < n; i++) {
        g.fillStyle = `rgba(${r},${gg},${b},${0.25 + rnd() * 0.35})`;
        g.fillRect(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), s, s);
      }
    } else {
      g.fillStyle = `rgba(${r},${gg},${b},${0.55 * density})`;
      g.fill(path, "evenodd");
      const n = Math.round(areaPx / 14 * density), len = faceW * (st.beard === "completa" ? 0.035 : 0.02);
      g.lineWidth = Math.max(1, faceW * 0.003);
      g.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), a = Math.PI / 2 + (rnd() - 0.5) * 0.9, v = (rnd() - 0.5) * 50;
        g.strokeStyle = `rgba(${Math.max(0, r + v)},${Math.max(0, gg + v)},${Math.max(0, b + v)},${0.5 + rnd() * 0.4})`;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.stroke();
      }
    }
    g.restore();
    ctx.save();
    ctx.filter = `blur(${Math.max(1, faceW * 0.006)}px)`;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 0.75;
    ctx.drawImage(layer, 0, 0);
    ctx.globalAlpha = 1;
  }

  async function paint() {
    if (!st.on || !app.source) return;
    $("o-hstrength").textContent = $("hair-strength").value + " %";
    $("o-bdensity").textContent = $("beard-density").value + " %";
    await ensureModels();
    if (st.frame) return;
    st.frame = requestAnimationFrame(() => {
      st.frame = 0;
      const { width: w, height: h, data } = app.source;
      canvas.width = w; canvas.height = h;
      const pixels = st.hair && st.mask ? pelo.recolor(data, st.mask, color.hexToRgb(st.hair), +$("hair-strength").value / 100) : data;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), w, h), 0, 0);
      if (st.beard !== "ninguna" && st.landmarks) drawBeard(pelo.beardShapes(st.landmarks, w, h, st.beard), beardColor(), +$("beard-density").value / 100);
      canvas.hidden = false;
      report();
    });
  }

  function report() {
    const rep = $("report-probador");
    if (app.tab !== "probador" || app.probadorMode !== "hair") return;
    rep.replaceChildren();
    if (!app.source) { el("p", "Sube una foto de frente en «Mi foto» para probarte colores de pelo y barbas.", rep, "empty"); return; }
    const s = color.SEASONS[st.season], fam = s.family, rec = pelo.HAIR_COLORS[fam];
    el("h2", "💇 Pelo y barba", rep);
    if (st.hair) {
      const named = rec.find(([, hex]) => hex === st.hair);
      const near = rec.map(([n, hex]) => ({ n, d: color.deltaE(color.hexToLab(hex), color.hexToLab(st.hair)) })).sort((a, b) => a.d - b.d)[0];
      if (named || near.d < 12) el("p", `✔ ${named ? named[0] : "Este tono"} encaja con tu paleta ${s.name}.`, rep, "good");
      else el("p", `≈ Este tono no está entre los recomendados para ${s.name}; el más parecido que sí te va es ${near.n}.`, rep);
    }
    const row = el("div", "", rep, "swatches");
    for (const [n, hex] of rec) { const c = el("div", "", row, "sw-cell"); swatch(hex, c, n, "swatch big"); el("code", n, c); }
    el("p", `Evita: ${pelo.HAIR_AVOID[fam]}.`, rep, "hint");
    if (app.profile.face) el("p", `Barbas que favorecen tu cara ${app.profile.face.shape.name.toLowerCase()}: ${app.profile.face.beards.map((b) => b.title).join(" · ")}.`, rep, "hint");
    el("p", "Es una simulación: el color y la barba son aproximados y el corte no cambia (eso necesitaría IA generativa y una tarjeta gráfica potente). Todo se calcula en tu dispositivo.", rep, "hint");
  }

  app.on("probador", (msg) => {
    if (msg.season) st.season = msg.season;
    if ("show" in msg) {
      st.on = msg.show;
      $("hair-tools").hidden = $("beard-tools").hidden = !st.on;
      canvas.hidden = !st.on;
      if (st.on) { buildColors(); paint(); }
    }
    if (msg.render) { if (st.on) buildColors(); report(); }
  });
  app.on("photo", () => { st.mask = null; st.landmarks = null; canvas.hidden = true; if (st.on) paint(); });
})();
