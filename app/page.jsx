"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARCHETYPES, PUBLIC_CASTS, REAL_CASTS } from "../lib/personas";
import { extractText, ACCEPT, TYPE_LABEL } from "../lib/extract";
import { Seal, Wordmark } from "./Logo";
import ConveyorLoader from "./ConveyorLoader";
import { MemeCard, PostThread, ShortVideo } from "./Studio";

const REAL_MODE_KEY = "culturelm.realModeAccepted";

const STUDIO = [
  { kind: "memes", label: "Memes", icon: "😂", loading: "Cooking the memes" },
  { kind: "post", label: "The Post", icon: "🧵", loading: "Drafting the post" },
  { kind: "short", label: "Short", icon: "📱", loading: "Cutting the short" },
];

function monogram(name) {
  const words = name.split(/[\s-]+/).filter((w) => w && w !== "THE");
  return words.slice(0, 2).map((w) => w[0]).join("");
}

function colorMap(cast) {
  const map = {};
  cast.hosts.forEach((h) => {
    map[h.name.toUpperCase()] = h.color;
  });
  return map;
}

function ScriptView({ script, colors }) {
  const turns = useMemo(
    () =>
      script
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line, i) => {
          const m = line.match(/^([A-Z][A-Z .'\-]{0,24}):\s*(.*)$/);
          return m ? { key: i, speaker: m[1], text: m[2] } : { key: i, speaker: null, text: line };
        }),
    [script]
  );
  return (
    <div className="script">
      {turns.map((t) => (
        <p className="turn" key={t.key}>
          {t.speaker && (
            <span className="speaker" style={{ color: colors[t.speaker.toUpperCase()] || "#FF5CC0" }}>
              {t.speaker}
            </span>
          )}
          {t.text}
        </p>
      ))}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("public");
  const [archetypeId, setArchetypeId] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [studio, setStudio] = useState({});
  const [studioBusy, setStudioBusy] = useState(null);
  const [studioError, setStudioError] = useState(null);
  const fileInput = useRef(null);
  const loaderRef = useRef(null);
  const outputRef = useRef(null);

  const casts = mode === "real" ? REAL_CASTS : PUBLIC_CASTS;
  const anyBusy = busy || audioBusy || !!studioBusy;
  const ready = archetypeId && sourceText.trim().length > 0 && !anyBusy;
  const resultCast = result ? (result.mode === "real" ? REAL_CASTS : PUBLIC_CASTS)[result.archetypeId] : null;
  const resultColors = useMemo(() => (resultCast ? colorMap(resultCast) : {}), [resultCast]);

  const loadingLabel = busy
    ? "Writing the episode"
    : audioBusy
      ? "Recording in the booth"
      : STUDIO.find((s) => s.kind === studioBusy)?.loading;

  useEffect(() => {
    if (anyBusy) setTimeout(() => loaderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [anyBusy]);

  useEffect(() => {
    setCopied(false);
    setAudioError(null);
    setShowTranscript(false);
    setStudioError(null);
    setStudio((old) => {
      if (old.short?.audioUrl) URL.revokeObjectURL(old.short.audioUrl);
      return {};
    });
    setAudioUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, [result]);

  const onFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    try {
      setFileName(`${file.name} — reading…`);
      const text = await extractText(file);
      if (!text) throw new Error("empty");
      setSourceText(text);
      setFileName(file.name);
    } catch {
      setFileName(null);
      setError(`Couldn't read that file. Try ${TYPE_LABEL}, or paste the text.`);
    }
  }, []);

  const requestRealMode = () => {
    if (typeof window !== "undefined" && localStorage.getItem(REAL_MODE_KEY)) setMode("real");
    else setShowModal(true);
  };

  const acceptRealMode = () => {
    localStorage.setItem(REAL_MODE_KEY, "1");
    setShowModal(false);
    setMode("real");
  };

  const fetchAudio = async (script, show, castMode) => {
    const res = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script, archetypeId: show, mode: castMode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Audio generation broke. Try again.");
    }
    return URL.createObjectURL(await res.blob());
  };

  const generateAudio = async (episode) => {
    if (!episode || audioBusy) return;
    setAudioBusy(true);
    setAudioError(null);
    try {
      const url = await fetchAudio(episode.script, episode.archetypeId, episode.mode);
      setAudioUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setAudioError(e.message);
      setShowTranscript(true);
    } finally {
      setAudioBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetypeId, mode, sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      const episode = { ...data, archetypeId, mode };
      setResult(episode);
      generateAudio(episode);
    } catch (e) {
      setError(e.message === "failed" ? "Something broke. Run it again." : e.message);
    } finally {
      setBusy(false);
    }
  };

  const runStudio = async (kind) => {
    if (!result || anyBusy) return;
    setStudioBusy(kind);
    setStudioError(null);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, archetypeId: result.archetypeId, mode: result.mode, sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The studio broke. Try again.");
      if (kind === "short") {
        const script = data.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
        data.audioUrl = await fetchAudio(script, result.archetypeId, result.mode);
      }
      setStudio((old) => {
        if (kind === "short" && old.short?.audioUrl) URL.revokeObjectURL(old.short.audioUrl);
        return { ...old, [kind]: data };
      });
    } catch (e) {
      setStudioError(e.message);
    } finally {
      setStudioBusy(null);
    }
  };

  const copyScript = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.script);
    setCopied(true);
  };

  return (
    <main className="wrap">
      <header className="masthead">
        <Seal size={46} />
        <Wordmark />
      </header>
      <p className="lede">Drop anything. Hear it the culture way.</p>

      <div
        className={`drop ${drag ? "drag" : ""} ${fileName ? "loaded" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        <button className="drop-target" onClick={() => fileInput.current?.click()}>
          <span className="drop-icon" aria-hidden="true">
            {fileName ? "✓" : "↑"}
          </span>
          <span className="drop-title">{fileName || "Drop a file"}</span>
          <span className="drop-sub">{fileName ? "Tap to swap it" : "PDF · Word · web page · text"}</span>
        </button>
        <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <textarea
          placeholder="or paste it here"
          value={fileName ? sourceText.slice(0, 4000) : sourceText}
          onChange={(e) => {
            setSourceText(e.target.value);
            setFileName(null);
          }}
        />
      </div>

      <div className="modes" role="group" aria-label="Cast type">
        <button className={mode === "public" ? "on" : ""} onClick={() => setMode("public")}>
          House casts
        </button>
        <button className={mode === "real" ? "on" : ""} onClick={requestRealMode}>
          Real casts · beta
        </button>
      </div>

      <div className="shows-frame">
        <div className="shows">
          {ARCHETYPES.map((a) => {
            const cast = casts[a.id];
            const on = archetypeId === a.id;
            return (
              <button key={a.id} className={`show ${on ? "on" : ""}`} onClick={() => setArchetypeId(a.id)} aria-pressed={on}>
                <span className="show-badge">{monogram(cast.name)}</span>
                <span className="show-name">{cast.name}</span>
                <span className="show-tag">{cast.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button className="run" disabled={!ready} onClick={generate}>
        Run it
      </button>
      {!anyBusy && (!sourceText.trim() || !archetypeId) && (
        <p className="hint">{!sourceText.trim() ? "Drop something to start" : "Pick a show"}</p>
      )}

      {error && <div className="error">{error}</div>}

      {anyBusy && (
        <div ref={loaderRef} className="loader-slot">
          <ConveyorLoader label={loadingLabel} />
        </div>
      )}

      {result && (
        <section className="episode" ref={outputRef}>
          <div className="episode-show">{result.show}</div>

          {audioUrl && (
            <div className="player">
              <audio controls src={audioUrl} />
            </div>
          )}
          {audioError && <div className="error">{audioError}</div>}

          <div className="chips">
            {audioUrl && (
              <a className="chip" href={audioUrl} download="culturelm-episode.wav">
                Download
              </a>
            )}
            <button className="chip" onClick={() => generateAudio(result)} disabled={anyBusy}>
              {audioUrl ? "Re-record" : "Record audio"}
            </button>
            <button className="chip" onClick={generate} disabled={anyBusy}>
              Run it back
            </button>
            <button className="chip" onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? "Hide script" : "Script"}
            </button>
            {showTranscript && (
              <button className="chip" onClick={copyScript}>
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          {showTranscript && <ScriptView script={result.script} colors={resultColors} />}

          <div className="studio">
            <div className="studio-label">Make more from it</div>
            <div className="studio-row">
              {STUDIO.map((s) => (
                <button
                  key={s.kind}
                  className={`orb ${studio[s.kind] ? "done" : ""}`}
                  onClick={() => runStudio(s.kind)}
                  disabled={anyBusy}
                >
                  <span className="orb-icon" aria-hidden="true">
                    {s.icon}
                  </span>
                  <span className="orb-label">{s.label}</span>
                </button>
              ))}
            </div>
            {studioError && <div className="error">{studioError}</div>}

            {studio.memes && (
              <div className="memes">
                {studio.memes.memes.map((m, i) => (
                  <MemeCard key={i} meme={m} index={i} showName={result.show} />
                ))}
              </div>
            )}
            {studio.post && <PostThread post={studio.post} showName={result.show} />}
            {studio.short && <ShortVideo short={studio.short} audioUrl={studio.short.audioUrl} colors={resultColors} />}
          </div>
        </section>
      )}

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Real casts</h3>
            <p>
              These are <em>fan-made parody</em> scripts in the style of real shows and streamers. Nothing here was
              said by, approved by, or is affiliated with the people named.
            </p>
            <p>Personal and educational use while in beta. Don't repost them as real quotes.</p>
            <div className="modal-actions">
              <button className="decline" onClick={() => setShowModal(false)}>
                Nah
              </button>
              <button className="accept" onClick={acceptRealMode}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>CULTURELM</footer>
    </main>
  );
}
