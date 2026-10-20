# MediaPipe (vendorizado, D-19 y D-22)

Face Landmarker coloca solos los 8 puntos de «Cara» y la barba simulada del Probador; Hair Segmenter recorta el pelo
para cambiarle el color. Cada modelo se carga **solo** cuando se usa.

| Archivo | Origen | SHA-256 del original |
|---|---|---|
| `vision_bundle.js` | `@mediapipe/tasks-vision@0.10.21` → `vision_bundle.cjs`, envuelto como script clásico (expone `self.MPVision`) | — |
| `vision_wasm_internal.js` | mismo paquete, `wasm/vision_wasm_internal.js`, sin cambios | — |
| `wasm.b64.js` | `wasm/vision_wasm_internal.wasm` en base64 | `f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7` |
| `hair_segmenter.b64.js` | `https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite` en base64 | `2628cf3ce5f695f604cbea2841e00befcaa3624bf80caf3664bef2656d59bf84` |
| `face_landmarker.b64.js` | `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` en base64 | `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff` |

Licencia: Apache-2.0 (`LICENSE`). Por qué en base64: la CSP mantiene `connect-src 'none'`, así que no se puede
hacer `fetch` ni del propio `.wasm`; se pasan los bytes con `self.Module.wasmBinary` y `modelAssetBuffer`.
La única concesión es `'wasm-unsafe-eval'` en `script-src` (ejecutar WebAssembly), que no abre ninguna conexión.
