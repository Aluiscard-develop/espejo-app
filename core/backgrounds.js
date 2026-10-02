// Fondos por estilo, dibujados con Canvas 2D. `a` = ancla de la cabeza {x, y, r}.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.FA = root.FA || {}).backgrounds = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CJK = '"Noto Serif CJK JP", "Noto Sans CJK JP", "Hiragino Mincho ProN", "Yu Mincho", serif';

  function rays(ctx, a, count, len, color, widthFn, rng, from = 0) {
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      const ang = rng() * Math.PI * 2, r1 = from + rng() * 20, r2 = len * (0.6 + rng() * 0.4);
      ctx.lineWidth = widthFn();
      ctx.beginPath();
      ctx.moveTo(a.x + Math.cos(ang) * r1, a.y + Math.sin(ang) * r1);
      ctx.lineTo(a.x + Math.cos(ang) * r2, a.y + Math.sin(ang) * r2);
      ctx.stroke();
    }
  }

  function wedges(ctx, a, count, len, color) {
    ctx.fillStyle = color;
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i += 2) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.arc(a.x, a.y, len, i * step, (i + 1) * step);
      ctx.closePath();
      ctx.fill();
    }
  }

  const BACKGROUNDS = {
    eclipse(ctx, w, h, a, rng) {
      const far = Math.hypot(w, h);
      const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, far * 0.8);
      g.addColorStop(0, "#5a0d0d"); g.addColorStop(0.45, "#2a0606"); g.addColorStop(1, "#060303");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      rays(ctx, a, 110, far, "rgba(0,0,0,.6)", () => 0.6 + rng() * 2.4, rng, a.r * 1.3);
      const c = ctx.createRadialGradient(a.x, a.y, a.r * 0.95, a.x, a.y, a.r * 1.7);
      c.addColorStop(0, "rgba(255,200,120,1)"); c.addColorStop(0.12, "rgba(255,110,40,.95)");
      c.addColorStop(0.45, "rgba(170,20,20,.5)"); c.addColorStop(1, "rgba(90,0,0,0)");
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 1.7, 0, 7); ctx.fill();
      ctx.fillStyle = "#050202"; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
    },

    bloodMoon(ctx, w, h, a, rng) {
      ctx.fillStyle = "#060202"; ctx.fillRect(0, 0, w, h);
      const m = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 1.5);
      m.addColorStop(0, "#e2323a"); m.addColorStop(0.8, "#a50d16"); m.addColorStop(1, "#5a0409");
      ctx.fillStyle = m; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#8a0b12";
      for (let i = 0; i < 26; i++) {
        const x = rng() * w, wd = 4 + rng() * 16, len = h * (0.05 + rng() * 0.3);
        ctx.fillRect(x - wd / 2, 0, wd, len);
        ctx.beginPath(); ctx.arc(x, len, wd * 0.75, 0, 7); ctx.fill();
      }
      for (let i = 0; i < 120; i++) {
        ctx.beginPath(); ctx.arc(rng() * w, rng() * h, rng() * rng() * 9, 0, 7); ctx.fill();
      }
    },

    menacing(ctx, w, h, a, rng) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#3b0d5c"); g.addColorStop(1, "#b0306a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      rays(ctx, a, 160, Math.hypot(w, h), "rgba(255,210,90,.28)", () => 1 + rng() * 3, rng, a.r);
      const size = Math.round(w * 0.11);
      ctx.font = `900 ${size}px ${CJK}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      for (let i = 0; i < 14; i++) {
        const side = i % 2 ? 1 : -1;
        const x = w / 2 + side * (w * 0.32 + rng() * w * 0.16), y = h * (0.08 + (i / 14) * 0.8);
        ctx.save(); ctx.translate(x, y); ctx.rotate((rng() - 0.5) * 0.6);
        ctx.lineWidth = size * 0.14; ctx.strokeStyle = "#12051c"; ctx.strokeText("ゴ", 0, 0);
        ctx.fillStyle = "#d58cff"; ctx.fillText("ゴ", 0, 0);
        ctx.restore();
      }
    },

    mecha(ctx, w, h, a, rng) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1d4fa8"); g.addColorStop(0.7, "#7fb8ec"); g.addColorStop(1, "#d6ecff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      for (let i = 0; i < 40; i++) {
        const x = rng() * w * 1.4 - w * 0.2, y = rng() * h, len = 40 + rng() * 200;
        ctx.lineWidth = 1 + rng() * 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.35); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(120,255,230,.9)"; ctx.lineWidth = Math.max(2, w * 0.004);
      const b = a.r * 1.5, c = b * 0.3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = a.x + sx * b, y = a.y + 0.3 * a.r + sy * b;
        ctx.beginPath(); ctx.moveTo(x, y - sy * c); ctx.lineTo(x, y); ctx.lineTo(x - sx * c, y); ctx.stroke();
      }
      ctx.fillStyle = "rgba(120,255,230,.9)";
      ctx.font = `700 ${Math.round(w * 0.028)}px monospace`;
      ctx.fillText("TARGET  LOCK", a.x - b, a.y - b - w * 0.02);
      ctx.fillText("RX-78 // 0079", w * 0.04, h * 0.05);
    },

    nerv(ctx, w, h, a, rng) {
      ctx.fillStyle = "#050308"; ctx.fillRect(0, 0, w, h);
      const s = w * 0.05, hx = s * Math.sqrt(3);
      ctx.strokeStyle = "rgba(255,122,0,.45)"; ctx.lineWidth = 1.5;
      for (let row = -1; row * s * 1.5 < h + s; row++) for (let col = -1; col * hx < w + hx; col++) {
        const cx = col * hx + (row % 2 ? hx / 2 : 0), cy = row * s * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + (k * Math.PI) / 3; ctx.lineTo(cx + s * Math.cos(an), cy + s * Math.sin(an)); }
        ctx.closePath();
        if (rng() < 0.06) { ctx.fillStyle = "rgba(255,90,0,.35)"; ctx.fill(); }
        ctx.stroke();
      }
      ctx.fillStyle = "#f4f1ea"; ctx.textBaseline = "top"; ctx.textAlign = "left";
      ctx.font = `900 ${Math.round(w * 0.13)}px ${CJK}`;
      ctx.fillText("第壱話", w * 0.04, h * 0.03);
      ctx.font = `900 ${Math.round(w * 0.09)}px ${CJK}`;
      ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText("覚醒", w * 0.96, h * 0.62);
      ctx.fillStyle = "#c8141c";
      ctx.font = `700 ${Math.round(w * 0.03)}px ${CJK}`;
      ctx.fillText("警告  WARNING  警告", w * 0.96, h * 0.67);
    },

    popBurst(ctx, w, h, a, rng) {
      ctx.fillStyle = "#ff3fa4"; ctx.fillRect(0, 0, w, h);
      wedges(ctx, a, 28, Math.hypot(w, h), "#35e0ff");
      ctx.fillStyle = "rgba(255,230,60,.9)";
      const cell = w * 0.035;
      for (let y = 0; y < h; y += cell) for (let x = (y / cell) % 2 ? cell / 2 : 0; x < w; x += cell) {
        const r = cell * 0.28 * (0.3 + 0.7 * (y / h));
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      for (let i = 0; i < 7; i++) {
        const x = rng() * w, y = rng() * h * 0.6, r = w * (0.03 + rng() * 0.04);
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + rr * Math.cos(an), y + rr * Math.sin(an)); }
        ctx.closePath(); ctx.fillStyle = "#fff45c"; ctx.fill();
        ctx.lineWidth = w * 0.006; ctx.strokeStyle = "#000"; ctx.stroke();
      }
    },

    sunburst(ctx, w, h, a, rng) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#2aa4f5"); g.addColorStop(1, "#c4f1ff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      wedges(ctx, a, 36, Math.hypot(w, h), "rgba(255,210,63,.55)");
      ctx.lineWidth = w * 0.006; ctx.strokeStyle = "#1a0f0a"; ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 5; i++) {
        const cx = rng() * w, cy = h * (0.05 + rng() * 0.4), r = w * (0.03 + rng() * 0.03);
        ctx.beginPath();
        for (let k = 0; k < 4; k++) ctx.arc(cx + (k - 1.5) * r * 1.1, cy - (k % 2) * r * 0.5, r, 0, 7);
        ctx.fill(); ctx.stroke();
      }
    },

    cubes(ctx, w, h, a, rng) {
      ctx.fillStyle = "#ffc7dd"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1;
      const grid = w * 0.05;
      for (let x = 0; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const colors = ["#6fb8ff", "#ffd85a", "#ff7fb0", "#9b8cff"];
      for (let i = 0; i < 16; i++) {
        const x = rng() * w, y = rng() * h, s = w * (0.03 + rng() * 0.06), c = colors[i % colors.length];
        const top = [[x, y - s], [x + s, y - s / 2], [x, y], [x - s, y - s / 2]];
        const left = [[x - s, y - s / 2], [x, y], [x, y + s], [x - s, y + s / 2]];
        const right = [[x + s, y - s / 2], [x, y], [x, y + s], [x + s, y + s / 2]];
        [[top, 0.85], [left, 0.55], [right, 0.35]].forEach(([pts, alpha]) => {
          ctx.beginPath(); pts.forEach(([px, py]) => ctx.lineTo(px, py)); ctx.closePath();
          ctx.globalAlpha = alpha; ctx.fillStyle = c; ctx.fill();
          ctx.globalAlpha = 1; ctx.strokeStyle = "#3b2a3a"; ctx.lineWidth = 1.5; ctx.stroke();
        });
      }
    },
  };

  return { BACKGROUNDS };
});
