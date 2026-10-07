"use client";

import { useEffect, useRef } from "react";

// Loading state: a side-view production line. Documents ride the intake
// belt into a circular portal and come out the other side as mics and
// soundwaves. Drawn in a fixed 800x240 logical space, scaled to fit.

const MAG = "#F5209B";
const MAG_HI = "#FF5CC0";
const PERI = "#7B72F0";
const VW = 800;
const VH = 240;

const BELT_Y = 168;
const LEFT = { x0: 40, x1: 300 };
const RIGHT = { x0: 500, x1: 760 };
const PORTAL = { x: 400, y: 120, r: 62 };
const ROLLER_R = 13;

function rgba(hex, a) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export default function ConveyorLoader({ label }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = 0;
    let t = 0;
    let scale = 1;

    const resize = () => {
      const w = canvas.getBoundingClientRect().width || VW;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      scale = w / VW;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(VH * scale * dpr);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };
    window.addEventListener("resize", resize);
    resize();

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const roller = (x, y, spin) => {
      const g = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, ROLLER_R);
      g.addColorStop(0, "#4a4560");
      g.addColorStop(1, "#16121f");
      ctx.beginPath();
      ctx.arc(x, y, ROLLER_R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(MAG_HI, 0.55);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ROLLER_R - 4, 0);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = MAG_HI;
      ctx.fill();
      ctx.restore();
    };

    const belt = (x0, x1, travel) => {
      const top = BELT_Y - ROLLER_R;
      // legs + crossbar
      ctx.strokeStyle = "#2a2438";
      ctx.lineWidth = 4;
      [x0 + 34, x1 - 34].forEach((lx) => {
        ctx.beginPath();
        ctx.moveTo(lx, BELT_Y + ROLLER_R);
        ctx.lineTo(lx, VH - 14);
        ctx.stroke();
      });
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + 34, VH - 34);
      ctx.lineTo(x1 - 34, VH - 34);
      ctx.stroke();
      ctx.fillStyle = "#2a2438";
      [x0 + 34, x1 - 34].forEach((lx) => {
        rr(lx - 9, VH - 16, 18, 4, 2);
        ctx.fill();
      });

      // belt loop body
      rr(x0 - ROLLER_R, top, x1 - x0 + ROLLER_R * 2, ROLLER_R * 2, ROLLER_R);
      const g = ctx.createLinearGradient(0, top, 0, top + ROLLER_R * 2);
      g.addColorStop(0, "#221c30");
      g.addColorStop(1, "#0d0a14");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(MAG, 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();

      // moving tread on the top run
      ctx.save();
      rr(x0, top, x1 - x0, 5, 2);
      ctx.clip();
      ctx.strokeStyle = rgba(MAG_HI, 0.55);
      ctx.lineWidth = 1.2;
      const gap = 14;
      const off = (travel * 60) % gap;
      for (let x = x0 - gap + off; x < x1 + gap; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + 4, top + 5);
        ctx.stroke();
      }
      ctx.restore();

      // top highlight line
      ctx.strokeStyle = rgba(MAG_HI, 0.8);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, top + 0.5);
      ctx.lineTo(x1, top + 0.5);
      ctx.stroke();

      // rollers: ends + idlers
      const spin = travel * 4.6;
      roller(x0, BELT_Y, spin);
      roller(x1, BELT_Y, spin);
      ctx.globalAlpha = 0.55;
      for (let i = 1; i < 4; i++) roller(lerp(x0, x1, i / 4), BELT_Y + 4, spin);
      ctx.globalAlpha = 1;
    };

    const portal = (pulse) => {
      const { x, y, r } = PORTAL;
      // pedestal
      ctx.fillStyle = "#1a1526";
      rr(x - 26, y + r + 6, 52, VH - (y + r + 6) - 14, 6);
      ctx.fill();
      ctx.strokeStyle = rgba(MAG, 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();
      // core
      const core = ctx.createRadialGradient(x, y, 2, x, y, r);
      core.addColorStop(0, `rgba(255,255,255,${0.55 + 0.25 * pulse})`);
      core.addColorStop(0.3, rgba(MAG_HI, 0.45));
      core.addColorStop(0.75, rgba(PERI, 0.12));
      core.addColorStop(1, rgba(PERI, 0));
      ctx.beginPath();
      ctx.arc(x, y, r - 6, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
      // ring
      const ring = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      ring.addColorStop(0, MAG_HI);
      ring.addColorStop(1, PERI);
      ctx.save();
      ctx.shadowColor = MAG;
      ctx.shadowBlur = 18 + 14 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = ring;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
      // rotating segmented inner ring
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 2.2);
      ctx.strokeStyle = rgba(MAG_HI, 0.65);
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, r - 12, a, a + 0.28);
        ctx.stroke();
      }
      ctx.restore();
    };

    const doc = (x, y, s, a) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      const w = 18 * s, h = 23 * s;
      rr(-w / 2, -h, w, h, 2.5 * s);
      ctx.fillStyle = "#ece9f6";
      ctx.fill();
      ctx.fillStyle = "rgba(40,32,70,0.55)";
      for (let i = 0; i < 4; i++) ctx.fillRect(-w * 0.32, -h + h * 0.2 + i * h * 0.17, w * (i === 3 ? 0.4 : 0.64), 1.6 * s);
      ctx.restore();
    };

    const mic = (x, y, s, a) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      const g = ctx.createLinearGradient(0, -26 * s, 0, 0);
      g.addColorStop(0, MAG_HI);
      g.addColorStop(1, PERI);
      ctx.shadowColor = MAG;
      ctx.shadowBlur = 10;
      rr(-6 * s, -26 * s, 12 * s, 16 * s, 6 * s);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = MAG_HI;
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.arc(0, -15 * s, 9 * s, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.moveTo(0, -6 * s);
      ctx.lineTo(0, 0);
      ctx.moveTo(-5 * s, 0);
      ctx.lineTo(5 * s, 0);
      ctx.stroke();
      ctx.restore();
    };

    const wave = (x, y, s, a) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.shadowColor = MAG;
      ctx.shadowBlur = 8;
      for (let i = 0; i < 5; i++) {
        const hgt = (8 + 14 * Math.abs(Math.sin(t * 9 + i * 1.4))) * s;
        rr((i - 2) * 6 * s - 1.8 * s, -hgt, 3.6 * s, hgt, 1.8 * s);
        ctx.fillStyle = i % 2 ? PERI : MAG_HI;
        ctx.fill();
      }
      ctx.restore();
    };

    const surface = BELT_Y - ROLLER_R;
    const N = 6;

    const frame = (ts) => {
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (!reduce) t += dt;

      ctx.clearRect(0, 0, VW, VH);
      const travel = t * 0.9;
      belt(LEFT.x0, LEFT.x1, travel);
      belt(RIGHT.x0, RIGHT.x1, travel);

      let pulse = 0;
      const back = [];
      const front = [];
      for (let i = 0; i < N; i++) {
        const p = (t * 0.13 + i / N) % 1;
        const out = i % 2 ? mic : wave;
        if (p < 0.46) {
          const u = p / 0.46;
          front.push(() => doc(lerp(LEFT.x0 + 12, LEFT.x1 - 6, u), surface, 1, 1));
        } else if (p < 0.56) {
          const u = ease((p - 0.46) / 0.1);
          const x = lerp(LEFT.x1 - 6, PORTAL.x, u);
          const y = lerp(surface, PORTAL.y + 12, u) - Math.sin(u * Math.PI) * 26;
          pulse = Math.max(pulse, u);
          back.push(() => doc(x, y, lerp(1, 0.4, u), 1 - u * 0.9));
        } else if (p < 0.66) {
          const u = ease((p - 0.56) / 0.1);
          const x = lerp(PORTAL.x, RIGHT.x0 + 6, u);
          const y = lerp(PORTAL.y + 12, surface, u) - Math.sin(u * Math.PI) * 26;
          pulse = Math.max(pulse, 1 - u);
          front.push(() => out(x, y, lerp(0.4, 1, u), 0.1 + u * 0.9));
        } else {
          const u = (p - 0.66) / 0.34;
          const fade = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1;
          front.push(() => out(lerp(RIGHT.x0 + 6, RIGHT.x1 - 10, u), surface, 1, fade));
        }
      }
      back.forEach((d) => d());
      portal(pulse);
      front.forEach((d) => d());
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="loader" role="status" aria-live="polite">
      <canvas
        ref={canvasRef}
        aria-label="Loading: documents ride a conveyor belt through a portal and come out as microphones and soundwaves."
      />
      <div className="loader-label">
        <span className="live-dot" />
        {label}
      </div>
    </div>
  );
}
