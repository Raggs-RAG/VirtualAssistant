"use client";

import { useEffect, useRef, useState } from "react";

const MAG = "#F5209B";
const MAG_HI = "#FF5CC0";
const PERI = "#7B72F0";

function cssFont(varName, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draws text into a box, shrinking the font until it fits.
function fitText(ctx, text, x, y, maxW, maxH, { size = 56, min = 26, weight = 700, family, color = "#fff", align = "left", lh = 1.18 }) {
  let s = size;
  let lines;
  for (; s >= min; s -= 2) {
    ctx.font = `${weight} ${s}px ${family}`;
    lines = wrap(ctx, text, maxW);
    if (lines.length * s * lh <= maxH) break;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const total = lines.length * s * lh;
  let ty = y + (maxH - total) / 2;
  const tx = align === "center" ? x + maxW / 2 : x;
  for (const l of lines) {
    ctx.fillText(l, tx, ty);
    ty += s * lh;
  }
}

function backdrop(ctx, W, H) {
  ctx.fillStyle = "#050307";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, W);
  g.addColorStop(0, "rgba(245,32,155,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function divider(ctx, x0, x1, y) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "rgba(245,32,155,0)");
  g.addColorStop(0.5, "rgba(245,32,155,0.7)");
  g.addColorStop(1, "rgba(123,114,240,0)");
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}

function emoji(ctx, e, x, y, size, glow = 0) {
  ctx.save();
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (glow) {
    ctx.shadowColor = MAG;
    ctx.shadowBlur = glow;
  }
  ctx.fillText(e, x, y);
  ctx.restore();
}

function watermark(ctx, W, H, family) {
  ctx.font = `700 26px ${family}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("CULTURELM", W - 36, H - 30);
}

function drawMeme(canvas, meme, showName) {
  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const disp = cssFont("--font-display", "sans-serif");
  const body = cssFont("--font-body", "sans-serif");
  const p = meme.panels;
  const e = meme.emojis;
  backdrop(ctx, W, H);

  if (meme.format === "drake") {
    [0, 1].forEach((i) => {
      const y = 40 + i * 500;
      emoji(ctx, e[i] || (i ? "😎" : "🙅🏾‍♂️"), 220, y + 230, 220, i ? 40 : 0);
      fitText(ctx, p[i] || "", 430, y + 30, 600, 400, { size: 64, family: disp, color: i ? "#fff" : "rgba(255,255,255,0.55)" });
    });
    divider(ctx, 60, W - 60, 540);
  } else if (meme.format === "nobody") {
    fitText(ctx, p[0] || "Nobody:", 80, 90, 920, 120, { size: 64, family: body, weight: 500, color: "rgba(255,255,255,0.6)" });
    fitText(ctx, p[1] || "", 80, 220, 920, 200, { size: 64, family: body, weight: 600 });
    divider(ctx, 80, W - 80, 450);
    fitText(ctx, p[2] || "", 80, 490, 920, 300, { size: 76, family: disp, color: MAG_HI });
    emoji(ctx, e[2] || e[0] || "😭", W / 2, 900, 150, 30);
  } else if (meme.format === "pov") {
    ctx.font = `800 120px ${disp}`;
    const g = ctx.createLinearGradient(80, 0, 500, 0);
    g.addColorStop(0, MAG_HI);
    g.addColorStop(1, PERI);
    ctx.fillStyle = g;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("POV:", 80, 80);
    const setup = String(p[0] || "").replace(/^POV:\s*/i, "");
    fitText(ctx, setup, 80, 230, 920, 280, { size: 64, family: body, weight: 600 });
    divider(ctx, 80, W - 80, 540);
    fitText(ctx, p[1] || "", 80, 580, 640, 400, { size: 72, family: disp, color: "#fff" });
    emoji(ctx, e[1] || e[0] || "💀", 880, 780, 200, 40);
  } else if (meme.format === "brain") {
    const rows = p.slice(0, 4);
    const rh = (H - 80) / rows.length;
    rows.forEach((txt, i) => {
      const y = 40 + i * rh;
      emoji(ctx, e[i] || "🧠", 150, y + rh / 2, 120, 8 + i * 22);
      fitText(ctx, txt, 290, y + 20, 740, rh - 40, { size: 52, family: i === rows.length - 1 ? disp : body, weight: i === rows.length - 1 ? 800 : 600, color: i === rows.length - 1 ? MAG_HI : "#fff" });
      if (i) divider(ctx, 60, W - 60, y);
    });
  } else {
    // "post": a viral post with a reply under it
    const post = (x, y, w, name, handle, text, maxH, size) => {
      const r = 42;
      ctx.beginPath();
      ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
      const g = ctx.createLinearGradient(x, y, x + 2 * r, y + 2 * r);
      g.addColorStop(0, MAG_HI);
      g.addColorStop(1, PERI);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.font = `800 30px ${disp}`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name.slice(0, 2).toUpperCase(), x + r, y + r + 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = `700 34px ${body}`;
      ctx.fillText(name, x + 2 * r + 24, y + 36);
      ctx.font = `500 28px ${body}`;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText(handle, x + 2 * r + 24, y + 76);
      fitText(ctx, text, x, y + 112, w, maxH, { size, family: body, weight: 600 });
    };
    post(80, 90, 920, showName, "@culturelm · parody", p[0] || "", 420, 56);
    divider(ctx, 80, W - 80, 660);
    post(140, 700, 860, "The Chat", "@replying", p[1] || "", 200, 44);
  }
  watermark(ctx, W, H, disp);
}

export function MemeCard({ meme, showName, index }) {
  const canvasRef = useRef(null);
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      if (!alive) return;
      drawMeme(canvasRef.current, meme, showName);
      setSrc(canvasRef.current.toDataURL("image/png"));
    };
    run();
    return () => {
      alive = false;
    };
  }, [meme, showName]);

  return (
    <figure className="meme">
      <canvas ref={canvasRef} hidden />
      {src && <img src={src} alt={meme.panels.join(" / ")} />}
      <figcaption>{meme.fact}</figcaption>
      {src && (
        <a className="chip" href={src} download={`culturelm-meme-${index + 1}.png`}>
          Save
        </a>
      )}
    </figure>
  );
}

export function PostThread({ post, showName }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const n = post.posts.length;
    await navigator.clipboard.writeText(post.posts.map((p, i) => `${p} (${i + 1}/${n})`).join("\n\n"));
    setCopied(true);
  };
  return (
    <div className="thread">
      {post.headline && <h3 className="thread-head">{post.headline}</h3>}
      {post.posts.map((p, i) => (
        <div className="thread-post" key={i}>
          <div className="avatar">{showName.split(/[\s-]+/).filter((w) => w && w !== "THE").slice(0, 2).map((w) => w[0]).join("")}</div>
          <div className="thread-body">
            <div className="thread-meta">
              {showName} <span>· {i + 1}/{post.posts.length}</span>
            </div>
            <p>{p}</p>
          </div>
        </div>
      ))}
      <button className="chip" onClick={copy}>
        {copied ? "Copied" : "Copy thread"}
      </button>
    </div>
  );
}

// ---------- short-form video ----------

function schedule(lines) {
  const weights = lines.map((l) => l.text.length + 12);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const chunks = [];
  lines.forEach((l, i) => {
    const start = acc / total;
    acc += weights[i];
    const end = acc / total;
    const words = l.text.split(/\s+/).filter(Boolean);
    const groups = [];
    for (let k = 0; k < words.length; k += 3) groups.push(words.slice(k, k + 3).join(" "));
    const glen = groups.reduce((a, g) => a + g.length + 2, 0);
    let gacc = 0;
    groups.forEach((g) => {
      const s = start + (end - start) * (gacc / glen);
      gacc += g.length + 2;
      chunks.push({ speaker: l.speaker, text: g, s, e: start + (end - start) * (gacc / glen) });
    });
  });
  return chunks;
}

function drawShortFrame(ctx, W, H, time, dur, chunks, title, colors, fonts) {
  const prog = dur ? Math.min(1, time / dur) : 0;
  ctx.fillStyle = "#030205";
  ctx.fillRect(0, 0, W, H);

  // neon runner track
  const vx = W / 2;
  const vy = H * 0.36;
  const sky = ctx.createRadialGradient(vx, vy, 4, vx, vy, W);
  sky.addColorStop(0, "rgba(245,32,155,0.35)");
  sky.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const halfW = (y) => 12 + ((y - vy) / (H - vy)) * W * 0.62;
  ctx.strokeStyle = "rgba(255,92,192,0.9)";
  ctx.lineWidth = 2;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + side * halfW(H), H);
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(123,114,240,0.5)";
  [-1 / 3, 1 / 3].forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + f * 2 * halfW(H), H);
    ctx.stroke();
  });
  for (let k = 0; k < 14; k++) {
    const z = (k / 14 + time * 0.9) % 1;
    const y = vy + z * z * (H - vy);
    ctx.strokeStyle = `rgba(255,92,192,${0.08 + 0.4 * z})`;
    ctx.beginPath();
    ctx.moveTo(vx - halfW(y), y);
    ctx.lineTo(vx + halfW(y), y);
    ctx.stroke();
  }
  // obstacles
  for (let k = 0; k < 4; k++) {
    const z = (k / 4 + time * 0.45) % 1;
    const y = vy + z * z * (H - vy);
    const lane = (k * 7 + Math.floor(time * 0.45 + k / 4)) % 3;
    const x = vx + (lane - 1) * (2 / 3) * halfW(y);
    const s = 6 + z * z * 70;
    ctx.fillStyle = `rgba(123,114,240,${0.25 + 0.6 * z})`;
    ctx.shadowColor = PERI;
    ctx.shadowBlur = 20 * z;
    ctx.fillRect(x - s / 2, y - s, s, s);
    ctx.shadowBlur = 0;
  }
  // runner
  const lanePos = Math.sin(time * 1.7) * 0.9;
  const ry = H * 0.88 - Math.abs(Math.sin(time * 5)) * 46;
  const rx = vx + lanePos * (2 / 3) * halfW(H * 0.9);
  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(time * 4);
  ctx.shadowColor = MAG;
  ctx.shadowBlur = 30;
  const rg = ctx.createLinearGradient(-30, -30, 30, 30);
  rg.addColorStop(0, MAG_HI);
  rg.addColorStop(1, PERI);
  ctx.fillStyle = rg;
  ctx.fillRect(-30, -30, 60, 60);
  ctx.restore();

  // title pill
  ctx.font = `800 26px ${fonts.disp}`;
  const tw = Math.min(W - 80, ctx.measureText(title).width + 48);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect((W - tw) / 2, 54, tw, 52, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,92,192,0.7)";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, W / 2, 81, W - 110);

  // caption
  const c = chunks.find((ch) => prog >= ch.s && prog < ch.e) || (prog >= 1 ? null : chunks[0]);
  if (c) {
    const pop = Math.min(1, ((prog - c.s) * dur) / 0.12);
    const scale = 1.25 - 0.25 * pop;
    const col = colors[c.speaker] || MAG_HI;
    ctx.save();
    ctx.translate(W / 2, H * 0.6);
    ctx.font = `700 24px ${fonts.body}`;
    ctx.fillStyle = col;
    ctx.fillText(c.speaker, 0, -96);
    ctx.scale(scale, scale);
    ctx.font = `800 62px ${fonts.disp}`;
    ctx.lineJoin = "round";
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#000";
    const lines = wrap(ctx, c.text.toUpperCase(), W - 80);
    lines.forEach((l, i) => {
      const y = (i - (lines.length - 1) / 2) * 70;
      ctx.strokeText(l, 0, y);
      ctx.fillStyle = i === 0 ? "#fff" : MAG_HI;
      ctx.fillText(l, 0, y);
    });
    ctx.restore();
  }

  // progress + watermark
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(40, H - 40, W - 80, 5);
  ctx.fillStyle = MAG_HI;
  ctx.fillRect(40, H - 40, (W - 80) * prog, 5);
  ctx.font = `700 18px ${fonts.disp}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "right";
  ctx.fillText("CULTURELM", W - 40, H - 62);
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const opts = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

export function ShortVideo({ short, audioUrl, colors }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [video, setVideo] = useState(null);
  const [note, setNote] = useState(null);
  const W = 540;
  const H = 960;

  useEffect(() => {
    const c = canvasRef.current;
    c.width = W;
    c.height = H;
    const fonts = { disp: cssFont("--font-display", "sans-serif"), body: cssFont("--font-body", "sans-serif") };
    const draw = () => drawShortFrame(c.getContext("2d"), W, H, 0, 1, schedule(short.lines), short.title, colors, fonts);
    if (document.fonts?.ready) document.fonts.ready.then(draw);
    else draw();
  }, [short, colors]);

  useEffect(() => () => video && URL.revokeObjectURL(video.url), [video]);

  const render = async () => {
    setStatus("rendering");
    setNote(null);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const fonts = { disp: cssFont("--font-display", "sans-serif"), body: cssFont("--font-body", "sans-serif") };
    const chunks = schedule(short.lines);
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    try {
      const buf = await ac.decodeAudioData(await (await fetch(audioUrl)).arrayBuffer());
      const dur = buf.duration;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);

      const mime = pickMime();
      let rec = null;
      const parts = [];
      if (mime && canvas.captureStream) {
        const dest = ac.createMediaStreamDestination();
        src.connect(dest);
        const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
        rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
      } else {
        setNote("This browser can preview but not export video — open CultureLM in Chrome or Safari to save it.");
      }

      const finished = new Promise((resolve) => {
        if (!rec) return resolve(null);
        rec.onstop = () => resolve(new Blob(parts, { type: mime }));
      });

      rec?.start(250);
      const t0 = ac.currentTime;
      src.start();
      let raf = 0;
      const loop = () => {
        const time = ac.currentTime - t0;
        drawShortFrame(ctx, W, H, time, dur, chunks, short.title, colors, fonts);
        if (time < dur + 0.3) raf = requestAnimationFrame(loop);
        else rec?.state === "recording" && rec.stop();
      };
      loop();
      src.onended = () => setTimeout(() => {
        cancelAnimationFrame(raf);
        drawShortFrame(ctx, W, H, dur, dur, chunks, short.title, colors, fonts);
        if (rec?.state === "recording") rec.stop();
      }, 300);

      const blob = await finished;
      if (blob && blob.size) {
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        setVideo({ url: URL.createObjectURL(blob), ext });
      }
      setStatus("done");
    } catch (e) {
      setNote("Video render failed in this browser. The audio and script still work.");
      setStatus("idle");
    } finally {
      ac.close();
    }
  };

  return (
    <div className="short">
      {video ? (
        <video className="short-frame" src={video.url} controls playsInline />
      ) : (
        <canvas className="short-frame" ref={canvasRef} />
      )}
      <div className="short-actions">
        {!video && (
          <button className="chip chip-hot" onClick={render} disabled={status === "rendering"}>
            {status === "rendering" ? "Rendering — keep this tab open…" : "Render the short"}
          </button>
        )}
        {video && (
          <a className="chip chip-hot" href={video.url} download={`culturelm-short.${video.ext}`}>
            Save video
          </a>
        )}
      </div>
      {note && <p className="short-note">{note}</p>}
    </div>
  );
}
