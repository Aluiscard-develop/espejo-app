// Inserta chunks tEXt en un PNG (p. ej. la marca "noai"). Puro, sin DOM.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).png = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

  function textChunk(key, value) {
    const latin1 = (s) => Uint8Array.from(s, (ch) => { const c = ch.charCodeAt(0); if (c > 255) throw new Error("tEXt solo admite Latin-1"); return c; });
    const data = new Uint8Array([...latin1(key), 0, ...latin1(value)]);
    const chunk = new Uint8Array(12 + data.length);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length);
    chunk.set([116, 69, 88, 116], 4); // "tEXt"
    chunk.set(data, 8);
    view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
    return chunk;
  }

  // Inserta los textos justo después de IHDR.
  function addTextChunks(png, entries) {
    for (let i = 0; i < 8; i++) if (png[i] !== SIGNATURE[i]) throw new Error("No es un PNG");
    const ihdrLen = new DataView(png.buffer, png.byteOffset).getUint32(8);
    const cut = 8 + 12 + ihdrLen;
    const chunks = Object.entries(entries).map(([k, v]) => textChunk(k, v));
    const total = png.length + chunks.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(total);
    out.set(png.subarray(0, cut), 0);
    let off = cut;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    out.set(png.subarray(cut), off);
    return out;
  }

  // Lista los chunks (tipo + texto si es tEXt). Útil para tests y verificación.
  function listChunks(png) {
    const view = new DataView(png.buffer, png.byteOffset);
    const out = [];
    for (let off = 8; off < png.length; ) {
      const len = view.getUint32(off);
      const type = String.fromCharCode(...png.subarray(off + 4, off + 8));
      const entry = { type, crcOk: view.getUint32(off + 8 + len) === crc32(png.subarray(off + 4, off + 8 + len)) };
      if (type === "tEXt") entry.text = String.fromCharCode(...png.subarray(off + 8, off + 8 + len));
      out.push(entry);
      off += 12 + len;
    }
    return out;
  }

  return { crc32, addTextChunks, listChunks };
});
