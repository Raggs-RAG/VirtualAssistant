"use client";

import { useEffect, useRef } from "react";

// Documents ride the feeder belt, arc through the portal, and land on the
// catcher belt transformed into mics and soundwaves. `active` speeds the
// line up and flares the portal while an episode is being made.

const GLOW_A = "#F5209B";
const GLOW_B = "#FF5CC0";
const PERI = "#7B72F0";

function rgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
const lerp = (a, b, t) => a + (b - a) * t;

export default function PortalHero({ active = false }) {
  const canvasRef = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, last = 0, t = 0, speed = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", resize);
    resize();

    const pts = () => ({
      feedA: { x: 0.02 * W, y: 0.3 * H },
      feedB: { x: 0.4 * W, y: 0.62 * H },
      portal: { x: 0.6 * W, y: 0.36 * H },
      catchA: { x: 0.74 * W, y: 0.62 * H },
      catchB: { x: 1.02 * W, y: 0.32 * H },
    });

    const arcPos = (u, P) => {
      if (u < 0.5) {
        const k = u / 0.5;
        return {
          x: lerp(P.feedB.x, P.portal.x, k),
          y: lerp(P.feedB.y, P.portal.y, k) - Math.sin(k * Math.PI) * 0.06 * H,
        };
      }
      const k = (u - 0.5) / 0.5;
      return {
        x: lerp(P.portal.x, P.catchA.x, k),
        y: lerp(P.portal.y, P.catchA.y, k) + Math.sin(k * Math.PI) * 0.05 * H,
      };
    };

    const drawBelt = (A, B, phase) => {
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      const wA = Math.max(8, 0.02 * W), wB = Math.max(22, 0.06 * W);
      ctx.beginPath();
      ctx.moveTo(A.x + nx * wA, A.y + ny * wA);
      ctx.lineTo(B.x + nx * wB, B.y + ny * wB);
      ctx.lineTo(B.x - nx * wB, B.y - ny * wB);
      ctx.lineTo(A.x - nx * wA, A.y - ny * wA);
      ctx.closePath();
      const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      g.addColorStop(0, "#0b0913");
      g.addColorStop(1, "#171226");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(GLOW_A, 0.18);
      ctx.lineWidth = 1;
      ctx.stroke();
      const n = Math.floor(len / 26);
      for (let i = 0; i <= n; i++) {
        const tt = (i / n + phase + 1) % 1;
        const cx = lerp(A.x, B.x, tt), cy = lerp(A.y, B.y, tt);
        const w = lerp(wA, wB, tt) * 0.82;
        ctx.strokeStyle = rgba(GLOW_B, 0.1 + 0.22 * tt);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx + nx * w - (dx / len) * 4, cy + ny * w - (dy / len) * 4);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - nx * w - (dx / len) * 4, cy - ny * w - (dy / len) * 4);
        ctx.stroke();
      }
    };

    const glow = (x, y, r) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.2);
      g.addColorStop(0, rgba(GLOW_B, 0.45));
      g.addColorStop(1, rgba(GLOW_A, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const roundRect = (x, y, w, h, rr) => {
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    // input: a document page with text lines
    const drawDoc = (x, y, r, rot) => {
      glow(x, y, r * 0.7);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(rot) * 0.15);
      const w = r * 1.4, h = r * 1.8;
      roundRect(-w / 2, -h / 2, w, h, r * 0.14);
      const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, "#f3f1fb");
      g.addColorStop(1, "#a8a3c4");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = "rgba(40,34,70,0.55)";
      for (let i = 0; i < 5; i++) {
        const lw = i === 0 ? w * 0.5 : w * (i % 2 ? 0.66 : 0.56);
        ctx.fillRect(-w * 0.32, -h * 0.32 + i * h * 0.14, lw, Math.max(1, h * 0.05));
      }
      ctx.restore();
    };

    // output: a glowing mic
    const drawMic = (x, y, r, rot) => {
      glow(x, y, r);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(rot) * 0.12);
      const hw = r * 0.55, hh = r * 0.95;
      roundRect(-hw, -hh, hw * 2, hh * 1.3, hw);
      const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
      g.addColorStop(0, GLOW_B);
      g.addColorStop(1, PERI);
      ctx.fillStyle = g;
      ctx.shadowColor = GLOW_A;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-hw * 0.6, -hh + i * hh * 0.28);
        ctx.lineTo(hw * 0.6, -hh + i * hh * 0.28);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(GLOW_B, 0.9);
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.arc(0, hh * 0.1, hw * 1.35, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.moveTo(0, hh * 0.1 + hw * 1.35);
      ctx.lineTo(0, hh * 0.75);
      ctx.stroke();
      ctx.restore();
    };

    // output: an equalizer soundwave
    const drawWave = (x, y, r, rot) => {
      glow(x, y, r);
      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = GLOW_A;
      ctx.shadowBlur = 12;
      const bars = 5, bw = r * 0.26;
      for (let i = 0; i < bars; i++) {
        const hgt = r * (0.5 + 0.9 * Math.abs(Math.sin(rot * 1.7 + i * 1.3)));
        const bx = (i - (bars - 1) / 2) * bw * 1.6;
        const g = ctx.createLinearGradient(0, -hgt, 0, hgt);
        g.addColorStop(0, GLOW_B);
        g.addColorStop(1, PERI);
        ctx.fillStyle = g;
        roundRect(bx - bw / 2, -hgt / 2, bw, hgt, bw / 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawPortal = (P, flare) => {
      const { x, y } = P.portal;
      const rx = Math.max(42, 0.075 * W), ry = rx * 0.66;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let k = 3; k >= 1; k--) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx * (1 + k * 0.12), ry * (1 + k * 0.12), 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(GLOW_A, (0.05 + 0.05 * flare) / k);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4 + 3 * flare;
      ctx.strokeStyle = rgba(GLOW_B, 0.9);
      ctx.shadowColor = GLOW_A;
      ctx.shadowBlur = 28 + 40 * flare;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const core = ctx.createRadialGradient(x, y, 1, x, y, rx * 0.9);
      core.addColorStop(0, `rgba(255,255,255,${0.8 + 0.2 * flare})`);
      core.addColorStop(0.35, rgba(GLOW_B, 0.55));
      core.addColorStop(1, rgba(PERI, 0));
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 0.92, ry * 0.92, 0, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
      ctx.restore();
    };

    const frame = (ts) => {
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const target = activeRef.current ? 2.4 : 1;
      speed += (target - speed) * Math.min(1, dt * 2.5);
      if (!reduce) t += dt * 0.16 * speed;

      ctx.clearRect(0, 0, W, H);
      const P = pts();
      const bg = ctx.createRadialGradient(P.portal.x, P.portal.y, 10, P.portal.x, P.portal.y, 0.7 * W);
      bg.addColorStop(0, rgba(GLOW_A, activeRef.current ? 0.16 : 0.1));
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      drawBelt(P.catchA, P.catchB, (-t * 1.4) % 1);
      drawBelt(P.feedA, P.feedB, (t * 1.4) % 1);

      const N = 9;
      let flare = activeRef.current ? 0.5 : 0;
      const flying = [];
      for (let i = 0; i < N; i++) {
        const phase = (t * 0.9 + i / N) % 1;
        const rot = phase * Math.PI * 6;
        const out = i % 2 ? drawMic : drawWave;
        if (phase < 0.42) {
          const u = phase / 0.42;
          drawDoc(lerp(P.feedA.x, P.feedB.x, u), lerp(P.feedA.y, P.feedB.y, u), lerp(6, 20, u), rot);
        } else if (phase < 0.75) {
          const u = (phase - 0.42) / 0.33;
          const pos = arcPos(u, P);
          flare = Math.max(flare, 1 - Math.abs(u - 0.5) * 2);
          flying.push({ ...pos, u, rot, out });
        } else {
          const u = (phase - 0.75) / 0.25;
          out(lerp(P.catchA.x, P.catchB.x, u), lerp(P.catchA.y, P.catchB.y, u), lerp(20, 6, u), rot);
        }
      }
      flying.forEach((o) => o.u < 0.5 && drawDoc(o.x, o.y, 20, o.rot));
      drawPortal(P, flare);
      flying.forEach((o) => o.u >= 0.5 && o.out(o.x, o.y, 20, o.rot));

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={`stage ${active ? "stage-live" : ""}`}>
      <canvas
        ref={canvasRef}
        aria-label="Animation: documents ride a conveyor belt through a glowing portal and come out as microphones and soundwaves."
      />
      <div className="stage-corner">
        {active ? "on air · recording" : "doc in · episode out"}
      </div>
    </div>
  );
}
