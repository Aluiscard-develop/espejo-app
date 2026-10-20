// Pestaña "Probador": toca una prenda (foto o cámara en vivo) → ¿te favorece? y qué color buscar.
// También superpone monturas sobre tu foto, colocadas con los puntos de «Cara» si existen.
// El modo «Pelo y barba» vive en ui/pelo.js; aquí solo se cambia de modo y se le avisa ("probador").
(function () {
  "use strict";
  const { color, dibujos, app } = window.FA;
  const { $, el, swatch, pic } = app;
  const rep = $("report-probador");
  const layer = $("glasses-layer");
  const st = { mode: "color", season: null, manualSeason: false, history: [], glasses: "rect", gcolor: "#1A1A1A" };

  const GLASS_NAMES = { rect: "Rectangulares", square: "Cuadradas", round: "Redondas", oval: "Ovaladas", wayfarer: "Wayfarer", aviator: "Aviador",
    browline: "Browline", panto: "Panto", rimless: "Al aire", big: "Grandes", bottomwide: "Base ancha", small: "Pequeñas", cateye: "Ojo de gato" };
  const FRAME_HEX = { "Negro": "#1A1A1A", "Carey claro": "#A8743F", "Carey oscuro": "#4A2A14", "Dorado": "#C9A227", "Miel": "#C58A3C",
    "Marrón": "#5B3A29", "Oliva": "#556B2F", "Bronce": "#8C6239", "Gris": "#6E6E73", "Azul pizarra": "#4A5D73", "Transparente": "#B9C7D1",
    "Plateado": "#B8B8B8", "Azul marino": "#1B2A4A" };

  // ---- estación ----
  for (const [id, s] of Object.entries(color.SEASONS)) el("option", s.name, $("probador-season")).value = id;
  $("probador-season").addEventListener("change", (e) => { st.season = e.target.value; st.manualSeason = true; render(); });
  function syncSeason() {
    if (st.manualSeason) return;
    st.season = app.profile.color ? app.profile.color.season.id : st.season || "otono-suave";
    $("probador-season").value = st.season;
  }

  // ---- modo ----
  function setMode(m) {
    st.mode = m;
    $("mode-color").setAttribute("aria-checked", String(m === "color"));
    $("mode-glasses").setAttribute("aria-checked", String(m === "glasses"));
    $("mode-hair").setAttribute("aria-checked", String(m === "hair"));
    $("glasses-tools").hidden = m !== "glasses";
    $("probador-hint").textContent = {
      color: "Toca una prenda en la foto (o abre la cámara y toca tu ropa) y te digo si ese color te favorece.",
      glasses: "Elige una montura: se dibuja sobre tu foto. Ajusta tamaño y posición con los controles.",
      hair: app.profile.sexo === "mujer"
        ? "Elige un color de pelo: se simula sobre tu foto con un modelo que funciona dentro del navegador."
        : "Elige un color de pelo y una barba: se simulan sobre tu foto con modelos que funcionan dentro del navegador.",
    }[m];
    if (m !== "color") app.closeCamera();
    app.probadorMode = m;
    show();
    render();
  }
  $("mode-color").addEventListener("click", () => setMode("color"));
  $("mode-glasses").addEventListener("click", () => setMode("glasses"));
  $("mode-hair").addEventListener("click", () => setMode("hair"));
  const syncSexo = () => { $("mode-hair-label").textContent = app.profile.sexo === "mujer" ? "Pelo" : "Pelo y barba"; };
  app.on("profile", (k) => { if (k === "sexo") { syncSexo(); setMode(st.mode); } });
  syncSexo();

  // ---- color de prenda ----
  function tryColor(rgb, where) {
    const r = color.judge(rgb, st.season);
    st.history.unshift({ rgb, r, where });
    st.history.length = Math.min(st.history.length, 8);
    render();
  }

  $("photo").addEventListener("pointerdown", (e) => {
    if (app.tab !== "probador" || st.mode !== "color" || !app.source) return;
    const [x, y] = app.toImage(e, $("photo"));
    const { data, width: w, height: h } = app.source;
    const raw = color.sampleCircle(data, w, h, x, y, Math.max(3, w * 0.01));
    if (!raw) return;
    placeDot(x / w, y / h);
    tryColor(color.applyGains(raw, app.wbGains), "foto");
  });

  $("cam").addEventListener("pointerdown", (e) => {
    if (app.tab !== "probador" || !app.camera.stream) return;
    const v = $("cam"), r = v.getBoundingClientRect();
    let u = (e.clientX - r.left) / r.width;
    if (v.classList.contains("mirror")) u = 1 - u;
    const f = app.cameraFrame(), fx = f.getContext("2d", { willReadFrequently: true });
    const img = fx.getImageData(0, 0, f.width, f.height);
    const rgb = color.sampleCircle(img.data, f.width, f.height, u * f.width, ((e.clientY - r.top) / r.height) * f.height, Math.max(3, f.width * 0.01));
    if (rgb) tryColor(rgb, "cámara");
  });

  let dot = null;
  function placeDot(u, v) {
    if (!dot) dot = el("span", "", $("frame"), "try-dot");
    dot.hidden = false;
    dot.style.setProperty("left", `${u * 100}%`);
    dot.style.setProperty("top", `${v * 100}%`);
  }

  const VERDICT = { si: ["✔", "Te favorece"], medio: ["≈", "Puede valer, pero hay opciones mejores"], no: ["✖", "Mejor evítalo cerca de la cara"] };

  function renderColor() {
    const s = color.SEASONS[st.season];
    if (!st.history.length) {
      el("p", app.source || app.camera.stream ? "Toca una prenda." : "Sube una foto en «Mi foto» o abre la cámara para empezar.", rep, "empty");
    } else {
      const { rgb, r } = st.history[0];
      const hex = color.rgbToHex(rgb);
      const card = el("div", "", rep, `verdict verdict-${r.verdict}`);
      swatch(hex, card, `Color de la prenda ${hex}`, "swatch huge");
      const txt = el("div", "", card);
      const [icon, title] = VERDICT[r.verdict];
      el("h2", `${icon} ${title}`, txt);
      const ul = el("ul", "", txt, "tips");
      for (const t of r.reasons) el("li", t, ul);
      const alt = el("div", "", rep, "alts");
      el("h3", r.verdict === "si" ? "Otros de tu paleta que combinan:" : "Busca mejor uno de estos:", alt, "sec-title");
      const row = el("div", "", alt, "swatches");
      for (const a of r.alternatives) { const c = el("div", "", row, "sw-cell"); swatch(a, c, a, "swatch big"); el("code", a, c); }
      el("p", `Comparado con tu paleta ${s.name}. La luz de la foto cambia los colores: ${app.wbGains ? "se aplicó tu balance de blancos." : "para más precisión, toca algo blanco en la pestaña «Color»."}`, rep, "hint");
      if (st.history.length > 1) {
        el("h3", "Lo último que has probado", rep, "sec-title");
        const hist = el("div", "", rep, "history");
        for (const h of st.history.slice(1)) {
          const c = el("div", "", hist, "sw-cell");
          swatch(color.rgbToHex(h.rgb), c, color.rgbToHex(h.rgb), "swatch big");
          el("span", VERDICT[h.r.verdict][0], c, "hist-mark");
        }
      }
    }
  }

  // ---- gafas ----
  const recommended = () => {
    const f = app.profile.face;
    return new Set(f ? f.glasses.map((g) => dibujos.iconFor("glasses", g.title)).filter(Boolean) : []);
  };

  function buildPicker() {
    const box = $("glasses-picker"), rec = recommended();
    box.replaceChildren();
    for (const [id, name] of Object.entries(GLASS_NAMES)) {
      const b = el("button", "", box);
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(id === st.glasses));
      pic(dibujos.glasses(id, name), b);
      el("span", (rec.has(id) ? "★ " : "") + name, b);
      b.addEventListener("click", () => { st.glasses = id; buildPicker(); placeGlasses(); render(); });
    }
  }

  function buildColors() {
    const sel = $("glasses-color"), prof = app.profile.color;
    const names = prof ? [...prof.jewelry.frames, ...Object.keys(FRAME_HEX).filter((n) => !prof.jewelry.frames.includes(n))] : Object.keys(FRAME_HEX);
    sel.replaceChildren();
    names.forEach((n, i) => {
      const o = el("option", (prof && i < prof.jewelry.frames.length ? "★ " : "") + n, sel);
      o.value = FRAME_HEX[n] || "#1A1A1A";
    });
    st.gcolor = sel.value;
  }
  $("glasses-color").addEventListener("change", (e) => { st.gcolor = e.target.value; placeGlasses(); });
  for (const id of ["gsize", "gx", "gy"]) $(id).addEventListener("input", placeGlasses);

  // Ancho total de la montura ≈ ancho de sienes; línea de los ojos ≈ 43 % entre nacimiento del pelo y mentón.
  function placeGlasses() {
    const on = app.tab === "probador" && st.mode === "glasses" && !!app.source;
    layer.hidden = !on;
    if (!on) return;
    const { width: W, height: H } = app.source, fp = app.profile.facePoints, box = app.getFaceBox();
    let cx, cy, gw, angle = 0;
    if (fp) {
      cx = (fp.foreL[0] + fp.foreR[0]) / 2;
      gw = Math.hypot(fp.foreR[0] - fp.foreL[0], fp.foreR[1] - fp.foreL[1]) * 1.12;
      cy = fp.top[1] + 0.43 * (fp.chin[1] - fp.top[1]);
      angle = (Math.atan2(fp.foreR[1] - fp.foreL[1], fp.foreR[0] - fp.foreL[0]) * 180) / Math.PI;
    } else if (box) {
      cx = box.cx; gw = box.width * 1.0; cy = box.top + 0.5 * box.width;
    } else {
      cx = W / 2; gw = W * 0.35; cy = H * 0.4;
    }
    gw *= +$("gsize").value / 100;
    cx += (+$("gx").value / 100) * gw;
    cy += (+$("gy").value / 100) * gw;
    const gh = gw * (50 / 120);
    $("o-gsize").textContent = $("gsize").value + " %";
    layer.innerHTML = dibujos.glasses(st.glasses, GLASS_NAMES[st.glasses], st.gcolor);
    layer.style.setProperty("left", `${((cx - gw / 2) / W) * 100}%`);
    layer.style.setProperty("top", `${((cy - gh / 2) / H) * 100}%`);
    layer.style.setProperty("width", `${(gw / W) * 100}%`);
    layer.style.setProperty("transform", `rotate(${angle}deg)`);
  }

  function renderGlasses() {
    const f = app.profile.face;
    if (!app.source) { el("p", "Sube una foto de frente en «Mi foto» para probarte monturas.", rep, "empty"); return; }
    el("h2", `👓 ${GLASS_NAMES[st.glasses]}`, rep);
    if (f) {
      const g = f.glasses.find((x) => dibujos.iconFor("glasses", x.title) === st.glasses);
      const bad = f.glassesAvoid.find((x) => dibujos.iconFor("glasses", x) === st.glasses);
      if (g) el("p", `✔ Recomendada para tu cara ${f.shape.name.toLowerCase()}: ${g.why}.`, rep, "good");
      else if (bad) el("p", `✖ Para tu cara ${f.shape.name.toLowerCase()} se suele evitar: ${bad}.`, rep, "bad");
      else el("p", "Neutra para tu forma de cara: decide tú con lo que ves.", rep);
    } else {
      el("p", "Marca tu cara en la pestaña «Cara» y te diré cuáles te favorecen (★) y las colocaré solas sobre tus ojos.", rep, "hint");
    }
    if (app.profile.color) el("p", `Colores de montura para tu paleta: ${app.profile.color.jewelry.frames.join(", ")} (★ en la lista).`, rep, "hint");
  }

  function render() {
    if (app.tab !== "probador") return;
    rep.replaceChildren();
    if (st.mode === "color") renderColor();
    else if (st.mode === "glasses") renderGlasses();
    else app.emit("probador", { render: rep, season: st.season });
  }

  function show() {
    const on = app.tab === "probador";
    if (dot) dot.hidden = !on || st.mode !== "color" || !st.history.length;
    $("frame").classList.toggle("try-color", on && st.mode === "color");
    if (on && st.mode === "glasses") { buildPicker(); buildColors(); }
    placeGlasses();
    app.emit("probador", { show: on && st.mode === "hair", season: st.season });
  }

  app.on("tab", (t) => { if (t === "probador") { syncSeason(); render(); } show(); });
  app.on("photo", () => { st.history = []; if (dot) dot.hidden = true; show(); render(); });
  app.on("camera", () => { show(); render(); });
  app.on("profile", (k) => { if (k === "color") syncSeason(); });
  syncSeason();
  setMode("color");
})();
