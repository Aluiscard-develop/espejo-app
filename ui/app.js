// Estado compartido entre pestañas (D-18): la foto actual, la cámara, el perfil calculado y un bus de
// eventos ("photo", "tab", "profile"). Todo en memoria salvo que la persona active «Recordar» (D-20):
// entonces se guardan solo las respuestas de los tests en localStorage, nunca la foto.
(function () {
  "use strict";
  const { mask: maskLib } = window.FA;
  const $ = (id) => document.getElementById(id);
  const WORK_SIDE = 1400;
  const NO_STAGE = new Set(["estilo", "piel", "resumen"]);

  const listeners = {};
  const app = {
    tab: "foto",
    bitmap: null, source: null, version: 0, faceBox: undefined,
    profile: { color: null, face: null, facePoints: null, estilo: null, piel: null },
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    emit(ev, arg) { for (const fn of listeners[ev] || []) fn(arg); },
    $,
  };
  window.FA.app = app;

  // ---- «Recordar» (D-20): opcional, apagado por defecto, solo respuestas ----
  const KEY = "espejo:v1";
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { saved = null; }
  app.memory = {
    enabled: !!(saved && saved.enabled),
    load(part) { return (this.enabled && saved && saved[part]) || null; },
    save(part, value) {
      if (!this.enabled) return;
      saved = { ...(saved || {}), enabled: true, [part]: value };
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* sin almacenamiento: se sigue en memoria */ }
    },
    forget() {
      saved = null;
      try { localStorage.removeItem(KEY); } catch { /* nada que borrar */ }
    },
  };

  app.setStatus = function (msg, isError = false) {
    $("status").textContent = msg;
    $("status").classList.toggle("error", isError);
  };

  app.el = function (tag, text, parent, cls) {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  };
  /** Inserta un SVG generado por core/dibujos.js (cadena propia, con etiquetas ya escapadas). */
  app.pic = function (svg, parent, cls) {
    const box = app.el("div", "", parent, cls || "pic-box");
    box.innerHTML = svg;
    return box;
  };
  app.swatch = function (hex, parent, label, cls) {
    const s = app.el("span", "", parent, cls || "swatch");
    s.style.setProperty("background", hex);
    s.title = label || hex;
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", label || hex);
    return s;
  };
  /** Grupo de botones-ficha para una pregunta tipo test. */
  app.quiz = function (parent, questions, answers, onChange) {
    for (const q of questions) {
      const box = app.el("div", "", parent, "q");
      const id = "q-" + q.id;
      app.el("p", q.q, box, "q-title").id = id;
      const chips = app.el("div", "", box, "chips");
      chips.setAttribute("role", "radiogroup");
      chips.setAttribute("aria-labelledby", id);
      for (const o of q.options) {
        const b = app.el("button", o.label, chips);
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(answers[q.id] === o.v));
        b.addEventListener("click", () => {
          answers[q.id] = answers[q.id] === o.v ? undefined : o.v;
          for (const c of chips.children) c.setAttribute("aria-checked", String(c === b && answers[q.id] === o.v));
          onChange();
        });
      }
    }
  };

  // ---- pestañas ----
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(name) {
    app.tab = name;
    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    }
    for (const p of document.querySelectorAll("[data-panel]")) p.hidden = p.dataset.panel !== name;
    for (const r of document.querySelectorAll("[data-report]")) r.hidden = r.dataset.report !== name;
    document.querySelector("main").classList.toggle("nostage", NO_STAGE.has(name));
    $("stage").hidden = NO_STAGE.has(name);
    app.emit("tab", name);
  }
  app.selectTab = selectTab;
  for (const t of tabs) {
    t.addEventListener("click", () => selectTab(t.dataset.tab));
    t.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(t), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus();
      selectTab(n.dataset.tab);
    });
  }

  // ---- foto ----
  const photo = $("photo");
  function drawPhoto() {
    photo.width = app.source.width;
    photo.height = app.source.height;
    photo.getContext("2d").putImageData(app.source, 0, 0);
  }

  /** Caja de la cara detectada por piel (se calcula una vez por foto, bajo demanda). */
  app.getFaceBox = function () {
    if (app.faceBox === undefined && app.source) {
      const { data, width: w, height: h } = app.source;
      app.faceBox = maskLib.detect(data, w, h).faceBox;
    }
    return app.faceBox;
  };

  app.loadBitmap = function (bmp) {
    if (app.bitmap) app.bitmap.close();
    app.bitmap = bmp;
    const s = Math.min(1, WORK_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.imageSmoothingQuality = "high";
    cx.drawImage(bmp, 0, 0, w, h);
    app.source = cx.getImageData(0, 0, w, h);
    app.version++;
    app.faceBox = undefined;
    app.profile.facePoints = null;
    drawPhoto();
    $("frame").hidden = false;
    $("drop").hidden = true;
    $("clear").disabled = false;
    app.setStatus("");
    app.emit("photo", app.source);
  };

  async function loadFile(file) {
    if (!file || !/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) {
      app.setStatus("Formato no soportado. Usa JPG, PNG o WebP (las HEIC de iPhone hay que convertirlas antes).", true);
      return;
    }
    app.setStatus("Cargando…");
    try {
      app.loadBitmap(await createImageBitmap(file, { imageOrientation: "from-image" }));
    } catch (err) {
      app.setStatus("No se pudo leer la imagen: " + err.message, true);
    }
  }

  $("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
  $("pick").addEventListener("click", () => $("file").click());
  const stage = $("stage");
  stage.addEventListener("dragover", (e) => { e.preventDefault(); stage.classList.add("dragging"); });
  stage.addEventListener("dragleave", () => stage.classList.remove("dragging"));
  stage.addEventListener("drop", (e) => { e.preventDefault(); stage.classList.remove("dragging"); loadFile(e.dataTransfer.files[0]); });
  window.addEventListener("paste", (e) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    if (item) loadFile(item.getAsFile());
  });

  $("clear").addEventListener("click", () => {
    if (app.bitmap) { app.bitmap.close(); app.bitmap = null; }
    app.source = null;
    app.version++;
    app.faceBox = undefined;
    app.profile.facePoints = null;
    photo.width = photo.height = 0;
    $("frame").hidden = true;
    $("drop").hidden = false;
    $("file").value = "";
    $("clear").disabled = true;
    app.setStatus("");
    app.emit("photo", null);
  });

  // coordenadas del puntero → píxeles de la foto de trabajo
  app.toImage = function (e, elem) {
    const r = elem.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * app.source.width, ((e.clientY - r.top) / r.height) * app.source.height];
  };

  // ---- cámara (D-16): solo vídeo, se cierra al salir; la captura pasa a ser la foto ----
  const video = $("cam");
  const camera = { stream: null, facing: "user", live: false };
  app.camera = camera;

  async function openCamera(live = false) {
    if (!navigator.mediaDevices?.getUserMedia) {
      app.setStatus("Este navegador no permite usar la cámara aquí. Prueba con npm start o sube una foto.", true);
      return;
    }
    closeCamera();
    try {
      camera.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camera.facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    } catch (err) {
      app.setStatus("No se pudo abrir la cámara: " + (err.name === "NotAllowedError" ? "permiso denegado." : err.message), true);
      return;
    }
    camera.live = live;
    video.srcObject = camera.stream;
    video.classList.toggle("mirror", camera.facing === "user");
    await video.play().catch(() => {});
    $("camera").hidden = false;
    $("frame").hidden = $("drop").hidden = true;
    app.emit("camera", true);
  }

  function closeCamera() {
    if (camera.stream) for (const t of camera.stream.getTracks()) t.stop();
    camera.stream = null;
    video.srcObject = null;
    if (!$("camera").hidden) {
      $("camera").hidden = true;
      $("frame").hidden = !app.source;
      $("drop").hidden = !!app.source;
      app.emit("camera", false);
    }
  }
  app.closeCamera = closeCamera;

  /** Fotograma actual de la cámara como canvas (sin espejo: la foto es como te ven los demás). */
  app.cameraFrame = function () {
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    return c;
  };

  $("cam-shot").addEventListener("click", async () => {
    if (!camera.stream || !video.videoWidth) return;
    const bmp = await createImageBitmap(app.cameraFrame());
    closeCamera();
    app.loadBitmap(bmp);
  });
  $("cam-flip").addEventListener("click", () => { camera.facing = camera.facing === "user" ? "environment" : "user"; openCamera(camera.live); });
  $("cam-close").addEventListener("click", closeCamera);
  for (const id of ["cam-open", "cam-open2"]) $(id).addEventListener("click", () => openCamera(false));
  $("cam-open3").addEventListener("click", () => openCamera(true));
  app.on("tab", (t) => { if (t !== "probador" && t !== "foto") closeCamera(); });
  window.addEventListener("pagehide", closeCamera);

  // ---- portada: cómo funciona ----
  const STEPS = [
    ["📷", "Tu foto", "Súbela o tómala con la cámara. De frente y con luz de día.", "foto"],
    ["🎨", "Color", "Tu estación, tu paleta y si te va el oro o la plata.", "color"],
    ["💈", "Cara", "Tu forma de cara y los cortes, barbas y gafas que te favorecen.", "cara"],
    ["👔", "Estilo", "Los estilos de ropa que mejor te van, dibujados con tus colores.", "estilo"],
    ["🪞", "Probador", "Toca una prenda y te digo si te favorece. Pruébate monturas.", "probador"],
    ["🧴", "Piel", "Una rutina con ingredientes que tienen estudios detrás.", "piel"],
    ["⭐", "Resumen", "Todo en una ficha para llevar a la peluquería o de compras.", "resumen"],
  ];
  const home = $("report-foto");
  app.el("h2", "Así funciona", home);
  const grid = app.el("div", "", home, "steps");
  for (const [icon, title, text, tab] of STEPS) {
    const b = app.el("button", "", grid, "step");
    b.type = "button";
    app.el("span", icon, b, "step-icon").setAttribute("aria-hidden", "true");
    app.el("b", title, b);
    app.el("span", text, b);
    b.addEventListener("click", () => selectTab(tab));
  }
  app.el("p", "Las recomendaciones de color, cara y estilo son las reglas que usan asesores de imagen, barberos y ópticas: orientativas, no ciencia exacta. Las de piel citan sus estudios. Nada de esto es consejo médico.", home, "hint");

  $("remember").checked = app.memory.enabled;
  $("remember").addEventListener("change", (e) => {
    app.memory.enabled = e.target.checked;
    if (!e.target.checked) { app.memory.forget(); app.setStatus("Ya no se recuerda nada."); return; }
    app.emit("remember");
    app.setStatus("Tus respuestas se recordarán en este navegador.");
  });
  $("forget").addEventListener("click", () => {
    app.memory.forget();
    app.memory.enabled = $("remember").checked = false;
    app.setStatus("Borrado. La próxima vez empezarás de cero.");
  });

  // PWA: solo en modo servidor (los service workers no existen en file://).
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* sin modo offline; la app funciona igual */ });
  }

  selectTab("foto");
})();
