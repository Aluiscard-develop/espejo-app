// MediaPipe bajo demanda y sin red (D-19, D-22): wasm y modelos van en base64 dentro de scripts locales.
// El bundle consume self.ModuleFactory y self.Module al crear cada modelo, así que el cargador se vuelve a
// ejecutar por modelo y las creaciones van en fila (comparten esas variables globales).
(function () {
  "use strict";
  const { app } = window.FA;
  const DIR = "vendor/mediapipe/";
  const FILESET = { wasmLoaderPath: "", wasmBinaryPath: "vision_wasm_internal.wasm" }; // ruta vacía: el cargador ya está en la página

  const loadScript = (src) => new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { s.remove(); ok(); };
    s.onerror = () => fail(new Error("no se pudo cargar " + src));
    document.head.appendChild(s);
  });
  const fromB64 = (b64) => { const bin = atob(b64), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
  // Lee un modelo de su script y libera la cadena base64 (son megas).
  async function bytes(file, global) {
    await loadScript(DIR + file);
    const b = fromB64(self[global]);
    delete self[global];
    return b;
  }

  let wasm = null, queue = Promise.resolve();
  const tasks = {};
  function task(name, create) {
    if (!tasks[name]) {
      tasks[name] = queue = queue.catch(() => {}).then(async () => {
        if (!wasm) { wasm = await bytes("wasm.b64.js", "MP_WASM_B64"); await loadScript(DIR + "vision_bundle.js"); }
        await loadScript(DIR + "vision_wasm_internal.js");
        self.Module = { wasmBinary: wasm }; // el cargador usa estos bytes en vez de pedir el .wasm por red
        return create(self.MPVision);
      });
      tasks[name].catch(() => { delete tasks[name]; });
    }
    return tasks[name];
  }

  const faceLandmarker = () => task("face", async (V) => V.FaceLandmarker.createFromOptions(FILESET, {
    baseOptions: { modelAssetBuffer: await bytes("face_landmarker.b64.js", "MP_MODEL_B64"), delegate: "CPU" }, runningMode: "IMAGE", numFaces: 1,
  }));
  const hairSegmenter = () => task("hair", async (V) => V.ImageSegmenter.createFromOptions(FILESET, {
    baseOptions: { modelAssetBuffer: await bytes("hair_segmenter.b64.js", "MP_HAIR_B64"), delegate: "CPU" }, runningMode: "IMAGE",
    outputCategoryMask: false, outputConfidenceMasks: true,
  }));

  // Resultados por foto: se calculan una vez y se descartan al cambiar de foto.
  const cache = { version: -1, landmarks: undefined, hair: undefined };
  const fresh = () => { if (cache.version !== app.version) Object.assign(cache, { version: app.version, landmarks: undefined, hair: undefined }); };

  app.mp = {
    loaded: (name) => !!tasks[name],
    /** Landmarks normalizados de la cara de la foto actual, o null si no hay cara. */
    async faceLandmarks() {
      fresh();
      if (cache.landmarks === undefined) {
        const res = (await faceLandmarker()).detect(document.getElementById("photo"));
        cache.landmarks = (res.faceLandmarks && res.faceLandmarks[0]) || null;
      }
      return cache.landmarks;
    },
    /** Confianza de pelo (Float32Array del tamaño de la foto de trabajo). */
    async hairMask() {
      fresh();
      if (cache.hair === undefined) {
        const res = (await hairSegmenter()).segment(document.getElementById("photo"));
        const masks = res.confidenceMasks || [];
        // el modelo devuelve [fondo, pelo]; se copia antes de liberar la memoria del resultado
        cache.hair = masks.length ? Float32Array.from(masks[masks.length - 1].getAsFloat32Array()) : null;
        res.close();
      }
      return cache.hair;
    },
  };
})();
