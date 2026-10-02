// UI: carga de foto, elección de estilo, ajustes y exportación. Todo en memoria.
(function () {
  "use strict";
  const { styles, render, pipeline, backgrounds, png, ops, brush } = window.FA;
  const $ = (id) => document.getElementById(id);
  const MAX_SIDE = { normal: 1400, hq: 2400 };

  const out = $("out"), ctx = out.getContext("2d");
  const state = {
    bitmap: null,                        // foto decodificada, para cambiar de resolución sin recargar
    source: null, sourceVersion: 0, preset: styles.PRESETS[0], timer: 0,
    inFlight: false, dirty: false,       // un solo cálculo pesado a la vez; los cambios intermedios se agrupan
    layers: null, auto: null,            // última fase pesada y su máscara automática
    strokes: [], override: null,         // retoques del pincel
    brushOn: false, sign: 1, stroke: null, frame: 0,
  };

  function setStatus(msg, isError = false) {
    $("status").textContent = msg;
    $("status").classList.toggle("error", isError);
  }

  // ---- estilos ----
  for (const p of styles.PRESETS) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.dataset.id = p.id;
    b.innerHTML = `${p.name}<small>${p.hint}</small>`;
    b.addEventListener("click", () => selectPreset(p.id));
    $("styles").appendChild(b);
  }

  function selectPreset(id) {
    state.preset = styles.byId(id);
    for (const b of $("styles").children) b.setAttribute("aria-checked", String(b.dataset.id === id));
    resetAdjustments();
  }

  function resetAdjustments() {
    $("thick").value = 0;
    $("tau").value = state.preset.line.tau;
    $("dark").value = 0;
    updateOutputs();
    schedule();
  }

  // lado mayor / 1400: los estilos se ven igual a cualquier resolución (ver render.js)
  function scale() {
    const s = state.source;
    return s ? Math.max(0.5, Math.max(s.width, s.height) / render.REFERENCE_SIDE) : 1;
  }

  function adjustments() {
    return { thick: +$("thick").value, tau: +$("tau").value, dark: +$("dark").value, scale: scale() };
  }

  function updateOutputs() {
    $("o-thick").textContent = $("thick").value;
    $("o-tau").textContent = (+$("tau").value).toFixed(3);
    $("o-dark").textContent = $("dark").value;
    $("o-tol").textContent = +$("tol").value === 0 ? "sin fondo" : $("tol").value;
  }

  for (const id of ["thick", "tau", "dark", "tol"]) $(id).addEventListener("input", () => { updateOutputs(); schedule(); });
  $("reset").addEventListener("click", resetAdjustments);

  // ---- carga ----
  async function loadFile(file) {
    if (!file || !/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) {
      setStatus("Formato no soportado. Usa JPG, PNG o WebP (las HEIC de iPhone hay que convertirlas antes).", true);
      return;
    }
    setStatus("Cargando…");
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      if (state.bitmap) state.bitmap.close();
      state.bitmap = bmp;
      resetEdits();
      buildSource();
      $("frame").hidden = false;
      $("drop").hidden = true;
      $("controls").disabled = false;
    } catch (err) {
      setStatus("No se pudo leer la imagen: " + err.message, true);
    }
  }

  // Reescala la foto al tamaño de trabajo (normal o alta calidad) y lo prepara todo para ese tamaño.
  function buildSource() {
    const bmp = state.bitmap;
    const side = $("hq").checked ? MAX_SIDE.hq : MAX_SIDE.normal;
    const s = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.imageSmoothingQuality = "high";
    cx.drawImage(bmp, 0, 0, w, h);
    state.source = cx.getImageData(0, 0, w, h);
    state.sourceVersion++;
    engine.setSource(state.source);
    state.layers = state.auto = null;
    out.width = w; out.height = h;
    paint.width = w; paint.height = h;
    state.override = state.strokes.length ? brush.rebuild(state.strokes.map(toPixels), w, h) : null;
    const orig = $("orig");
    orig.width = w; orig.height = h;
    orig.getContext("2d").putImageData(state.source, 0, 0);
    $("o-res").textContent = `${w}×${h}`;
    schedule(0);
  }

  $("hq").addEventListener("change", () => { if (state.bitmap) buildSource(); });

  $("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
  const stage = $("stage");
  stage.addEventListener("dragover", (e) => { e.preventDefault(); stage.classList.add("dragging"); });
  stage.addEventListener("dragleave", () => stage.classList.remove("dragging"));
  stage.addEventListener("drop", (e) => { e.preventDefault(); stage.classList.remove("dragging"); loadFile(e.dataTransfer.files[0]); });
  window.addEventListener("paste", (e) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    if (item) loadFile(item.getAsFile());
  });

  $("clear").addEventListener("click", () => {
    state.source = null;
    if (state.bitmap) { state.bitmap.close(); state.bitmap = null; }
    $("o-res").textContent = "";
    state.sourceVersion++;
    engine.setSource(null);
    state.layers = state.auto = null;
    resetEdits();
    setBrush(false);
    ctx.clearRect(0, 0, out.width, out.height);
    out.width = out.height = 0;
    $("orig").width = $("orig").height = 0;
    $("frame").hidden = true;
    setCurtain(false);
    $("drop").hidden = false;
    $("file").value = "";
    $("controls").disabled = true;
    setStatus("");
  });

  // ---- render ----
  function schedule(delay = 120) {
    if (!state.source) return;
    clearTimeout(state.timer);
    state.timer = setTimeout(draw, delay);
  }

  function draw() {
    if (!state.source) return;
    if (state.inFlight) { state.dirty = true; return; }
    state.inFlight = true;
    state.dirty = false;
    const version = state.sourceVersion;
    const req = { presetId: state.preset.id, adj: adjustments(), tolerance: +$("tol").value };
    setStatus($("hq").checked ? "Entintando en alta calidad… (puede tardar unos segundos)" : "Entintando…");
    const t = performance.now();
    engine.render(req)
      .then(({ layers, auto }) => {
        if (version !== state.sourceVersion) return; // resultado de una foto o resolución anterior
        state.layers = layers;
        state.auto = auto;
        recomposite();
        setStatus("");
        out.dataset.ms = String(Math.round(performance.now() - t));
      })
      .catch((err) => setStatus("Error al procesar: " + err.message, true))
      .finally(() => {
        state.inFlight = false;
        if (state.dirty) draw();
      });
  }

  // ---- motores: Worker en modo servidor (npm start), hilo principal en modo archivo ----
  function drawBackgroundDom(w, h, bgId, anchor) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const bctx = c.getContext("2d", { willReadFrequently: true });
    backgrounds.BACKGROUNDS[bgId](bctx, w, h, anchor, ops.mulberry32(7));
    return bctx.getImageData(0, 0, w, h).data;
  }

  function inlineEngine() {
    const cache = new Map();
    return {
      background: false,
      setSource() { cache.clear(); },
      render(req) {
        // deja pintar el mensaje de estado antes de bloquear el hilo
        return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))).then(() =>
          pipeline.run({ source: state.source, preset: styles.byId(req.presetId), adj: req.adj, tolerance: req.tolerance, cache, drawBackground: drawBackgroundDom }));
      },
    };
  }

  function workerEngine() {
    const worker = new Worker("worker.js");
    const pending = new Map();
    let nextId = 0;
    worker.onmessage = (e) => {
      const msg = e.data, p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.type === "error") p.reject(new Error(msg.message));
      else p.resolve({ layers: msg.layers, auto: msg.auto });
    };
    worker.onerror = (e) => {
      // p. ej. navegador sin OffscreenCanvas en workers: se sigue en el hilo principal
      e.preventDefault();
      worker.terminate();
      useEngine(inlineEngine(), "Segundo plano no disponible (" + (e.message || "error del worker") + "); se usa el hilo principal.");
      for (const p of pending.values()) p.resolve(engine.render({ ...p.req }));
      pending.clear();
    };
    return {
      background: true,
      setSource(src) {
        // se envía una copia: la interfaz conserva la suya para la cortina y el modo de respaldo
        const copy = src && new ImageData(Uint8ClampedArray.from(src.data), src.width, src.height);
        worker.postMessage({ type: "source", source: copy }, copy ? [copy.data.buffer] : []);
      },
      render(req) {
        const id = ++nextId;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject, req });
          worker.postMessage({ type: "render", id, ...req });
        });
      },
    };
  }

  let engine;
  function useEngine(e, note) {
    engine = e;
    if (state.source) engine.setSource(state.source);
    $("mode").textContent = engine.background
      ? "Motor: segundo plano"
      : "Motor: hilo principal (con npm start la interfaz no se congela)";
    $("mode").dataset.mode = engine.background ? "worker" : "inline";
    if (note) setStatus(note);
  }
  const canUseWorker = location.protocol !== "file:" && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
  let initial = inlineEngine();
  if (canUseWorker) { try { initial = workerEngine(); } catch { /* se queda el hilo principal */ } }
  useEngine(initial);

  function currentMask() {
    if (!state.auto) return null;
    return state.override ? brush.applyOverride(state.auto.mask, state.override) : state.auto.mask;
  }

  // Fase ligera: se repite en cada trazo del pincel.
  function recomposite() {
    if (!state.layers) return;
    const mask = currentMask();
    ctx.putImageData(new ImageData(render.composite(state.layers, mask), state.layers.width, state.layers.height), 0, 0);
    if (state.brushOn) drawMaskView(mask);
  }

  // ---- pincel de máscara ----
  const paint = $("paint"), pctx = paint.getContext("2d"), cursor = $("cursor");

  function drawMaskView(mask) {
    const { width: w, height: h } = paint;
    const view = pctx.createImageData(w, h);
    if (mask) for (let i = 0; i < w * h; i++) {
      const a = 1 - mask[i];
      if (a <= 0.02) continue;
      view.data[4 * i] = 40; view.data[4 * i + 1] = 170; view.data[4 * i + 2] = 255;
      view.data[4 * i + 3] = a * 110;
    }
    pctx.putImageData(view, 0, 0);
  }

  function resetEdits() {
    state.strokes = [];
    state.override = null;
    state.stroke = null;
    updateBrushButtons();
  }

  function updateBrushButtons() {
    $("undo").disabled = $("wipe").disabled = state.strokes.length === 0;
    $("o-size").textContent = $("size").value + " px";
  }

  function setBrush(on) {
    state.brushOn = on;
    paint.hidden = $("brush-tools").hidden = !on;
    cursor.hidden = true;
    $("brush").setAttribute("aria-pressed", String(on));
    if (!on) return;
    setCurtain(false);
    if (+$("tol").value === 0) {
      // sin recorte no hay máscara que retocar: se reactiva con el valor por defecto
      $("tol").value = 18;
      updateOutputs();
      setStatus("Recorte de fondo reactivado para poder retocarlo.");
      schedule(0);
    } else {
      recomposite();
    }
  }

  function setTool(sign) {
    state.sign = sign;
    $("tool-person").setAttribute("aria-checked", String(sign > 0));
    $("tool-bg").setAttribute("aria-checked", String(sign < 0));
  }

  // coordenadas del puntero → píxeles de la imagen
  function toImage(e) {
    const r = paint.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * paint.width, ((e.clientY - r.top) / r.height) * paint.height];
  }

  // Los trazos se guardan en coordenadas relativas (0..1) para sobrevivir a un cambio de resolución.
  function toPixels(s) {
    return { points: s.points.map(([u, v]) => [u * paint.width, v * paint.height]), radius: s.radius * paint.width, sign: s.sign };
  }
  const brushRadius = () => (+$("size").value / 2) * scale(); // el tamaño se da en píxeles de referencia

  function moveCursor(e) {
    const r = paint.getBoundingClientRect();
    const d = (2 * brushRadius() * r.width) / paint.width;
    cursor.hidden = false;
    cursor.style.setProperty("left", `${e.clientX - r.left}px`);
    cursor.style.setProperty("top", `${e.clientY - r.top}px`);
    cursor.style.setProperty("width", `${d}px`);
    cursor.style.setProperty("height", `${d}px`);
  }

  function requestComposite() {
    if (state.frame) return;
    state.frame = requestAnimationFrame(() => { state.frame = 0; recomposite(); });
  }

  paint.addEventListener("pointerdown", (e) => {
    if (!state.auto || e.button > 0) return;
    paint.setPointerCapture(e.pointerId);
    const { width: w, height: h } = paint;
    if (!state.override) state.override = new Float32Array(w * h);
    const [x, y] = toImage(e);
    state.stroke = { points: [[x / w, y / h]], radius: brushRadius() / w, sign: state.sign };
    state.strokes.push(state.stroke);
    brush.applyStroke(state.override, w, h, toPixels(state.stroke));
    updateBrushButtons();
    requestComposite();
  });
  paint.addEventListener("pointermove", (e) => {
    moveCursor(e);
    const s = state.stroke;
    if (!s) return;
    const [x, y] = toImage(e), { width: w, height: h } = paint;
    s.points.push([x / w, y / h]);
    brush.applyStroke(state.override, w, h, toPixels({ points: s.points.slice(-2), radius: s.radius, sign: s.sign }));
    requestComposite();
  });
  const endStroke = () => { state.stroke = null; };
  paint.addEventListener("pointerup", endStroke);
  paint.addEventListener("pointercancel", endStroke);
  paint.addEventListener("pointerleave", () => { cursor.hidden = true; });

  function undo() {
    if (!state.strokes.length) return;
    state.strokes.pop();
    state.override = state.strokes.length ? brush.rebuild(state.strokes.map(toPixels), paint.width, paint.height) : null;
    updateBrushButtons();
    recomposite();
  }

  $("brush").addEventListener("click", () => setBrush(!state.brushOn));
  $("tool-person").addEventListener("click", () => setTool(1));
  $("tool-bg").addEventListener("click", () => setTool(-1));
  $("size").addEventListener("input", updateBrushButtons);
  $("undo").addEventListener("click", undo);
  $("wipe").addEventListener("click", () => { resetEdits(); recomposite(); });
  window.addEventListener("keydown", (e) => {
    if (!state.brushOn) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    else if (e.key === "[" || e.key === "]") {
      const s = $("size");
      s.value = +s.value + (e.key === "]" ? 8 : -8);
      updateBrushButtons();
    }
  });

  // ---- cortina antes/después ----
  function setCurtain(on) {
    if (on) setBrush(false);
    $("curtain").hidden = !on;
    $("compare").setAttribute("aria-pressed", String(on));
    if (on) $("split").focus();
  }
  function moveCurtain() {
    const v = +$("split").value;
    $("curtain").style.setProperty("--pos", v + "%");
    $("split").setAttribute("aria-valuetext", `${v} % original`);
  }
  $("compare").addEventListener("click", () => setCurtain($("curtain").hidden));
  $("split").addEventListener("input", moveCurtain);
  moveCurtain();

  // ---- exportar ----
  $("save").addEventListener("click", () => {
    out.toBlob(async (blob) => {
      if (!blob) { setStatus("No se pudo exportar.", true); return; }
      const bytes = png.addTextChunks(new Uint8Array(await blob.arrayBuffer()), {
        Software: "FiltroAnime",
        Comment: "noai, noimageai",
        Disclaimer: "No autorizado para entrenar IA / Not licensed for AI training",
      });
      const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `filtroanime-${state.preset.id}${$("hq").checked ? "-hq" : ""}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  });

  selectPreset(state.preset.id);
  updateOutputs();
  updateBrushButtons();
})();
