"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARCHETYPES, PUBLIC_CASTS, REAL_CASTS } from "../lib/personas";
import { extractText, ACCEPT, TYPE_LABEL } from "../lib/extract";

const REAL_MODE_KEY = "culturelm.realModeAccepted";

function ScriptView({ script, casts }) {
  const colorFor = useMemo(() => {
    const map = {};
    Object.values(casts).forEach((cast) =>
      cast.hosts.forEach((h) => {
        map[h.name.toUpperCase()] = h.color;
      })
    );
    return (name) => map[name.toUpperCase()] || "#E8A33D";
  }, [casts]);

  const turns = useMemo(() => {
    return script
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, i) => {
        const m = line.match(/^([A-Z][A-Z .'\-]{0,24}):\s*(.*)$/);
        if (m) return { key: i, speaker: m[1], text: m[2] };
        return { key: i, speaker: null, text: line };
      });
  }, [script]);

  return (
    <div className="script">
      {turns.map((t) => (
        <p className="turn" key={t.key}>
          {t.speaker && (
            <span className="speaker" style={{ color: colorFor(t.speaker) }}>
              {t.speaker}:
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
  const fileInput = useRef(null);
  const outputRef = useRef(null);

  const casts = mode === "real" ? REAL_CASTS : PUBLIC_CASTS;
  const ready = archetypeId && sourceText.trim().length > 0 && !busy;

  useEffect(() => {
    setCopied(false);
    setAudioError(null);
    setShowTranscript(false);
    setAudioUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, [result]);

  const onFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    try {
      setFileName(`${file.name} — reading...`);
      const text = await extractText(file);
      if (!text) throw new Error("empty");
      setSourceText(text);
      setFileName(file.name);
    } catch {
      setFileName(null);
      setError(
        `Couldn't read that file. Supported: ${TYPE_LABEL} — or paste the text.`
      );
    }
  }, []);

  const requestRealMode = () => {
    if (typeof window !== "undefined" && localStorage.getItem(REAL_MODE_KEY)) {
      setMode("real");
    } else {
      setShowModal(true);
    }
  };

  const acceptRealMode = () => {
    localStorage.setItem(REAL_MODE_KEY, "1");
    setShowModal(false);
    setMode("real");
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
      setResult(data);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (e) {
      setError(
        e.message === "failed"
          ? "Something broke. Try again — and if it keeps happening, the producer is on it."
          : e.message
      );
    } finally {
      setBusy(false);
    }
  };

  const copyScript = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.script);
    setCopied(true);
  };

  const generateAudio = async () => {
    if (!result || audioBusy) return;
    setAudioBusy(true);
    setAudioError(null);
    try {
      const res = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: result.script, archetypeId, mode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Audio generation broke. Try again.");
      }
      const blob = await res.blob();
      setAudioUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setShowTranscript(false);
    } catch (e) {
      setAudioError(e.message);
    } finally {
      setAudioBusy(false);
    }
  };

  return (
    <main className="wrap">
      <header className="brand">
        <div className="display brand-mark">CultureLM</div>
        <div className="brand-beta">beta</div>
      </header>

      <section className="hero">
        <h1 className="display">
          Run the news through <span className="accent">the culture.</span>
        </h1>
        <p>
          Upload any document. Pick your show. Get the breakdown the way your
          group chat would explain it.
        </p>
      </section>

      <div className="section-label">1 — Drop your source</div>
      <div
        className={`dropzone ${drag ? "drag" : ""} ${fileName ? "loaded" : ""}`}
        onClick={() => fileInput.current?.click()}
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
        {fileName ? (
          <>
            <strong>{fileName}</strong> loaded
          </>
        ) : (
          <>
            Drop a <strong>PDF, Word doc, HTML, CSV, JSON, or text file</strong>{" "}
            here or tap to browse
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <textarea
        placeholder="...or paste your text here."
        value={fileName ? sourceText.slice(0, 4000) : sourceText}
        onChange={(e) => {
          setSourceText(e.target.value);
          setFileName(null);
        }}
      />

      <div className="section-label">2 — Pick your show</div>
      <div className="mode-row">
        <button
          className={`mode-btn ${mode === "public" ? "active" : ""}`}
          onClick={() => setMode("public")}
        >
          The House Casts
        </button>
        <button
          className={`mode-btn ${mode === "real" ? "active" : ""}`}
          onClick={requestRealMode}
        >
          Real Cast — Beta
        </button>
      </div>
      <div className="grid">
        {ARCHETYPES.map((a) => {
          const cast = casts[a.id];
          return (
            <button
              key={a.id}
              className={`card ${archetypeId === a.id ? "active" : ""}`}
              onClick={() => setArchetypeId(a.id)}
            >
              <div className="display show">{cast.name}</div>
              <div className="cast">
                {cast.hosts.map((h) => h.name).join(" · ")}
              </div>
              <div className="tag">{cast.tagline}</div>
            </button>
          );
        })}
      </div>

      <button className="run" disabled={!ready} onClick={generate}>
        {busy ? "Recording the episode..." : "Run the Breakdown"}
      </button>
      {!sourceText.trim() && <div className="hint">Drop a PDF or paste text to start.</div>}
      {sourceText.trim() && !archetypeId && <div className="hint">Now pick your show ↑</div>}

      {busy && (
        <>
          <div className="spinner" />
          <div className="recording">Recording the episode...</div>
        </>
      )}

      {error && <div className="error">{error}</div>}

      {result && !busy && (
        <section className="output" ref={outputRef}>
          <div className="output-head">
            <h2 className="display">{result.show}</h2>
            <div className="output-actions">
              <button className="ghost-btn" onClick={copyScript}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="ghost-btn" onClick={generate}>
                Run it back
              </button>
              <button className="ghost-btn" onClick={generateAudio} disabled={audioBusy}>
                {audioBusy ? "In the booth..." : "🎧 Episode Audio"}
              </button>
            </div>
          </div>
          {audioError && <div className="error">{audioError}</div>}
          {audioUrl && (
            <div className="audio-bar">
              <audio controls src={audioUrl} style={{ width: "100%" }} />
              <a className="ghost-btn" href={audioUrl} download="culturelm-episode.wav">
                Download
              </a>
            </div>
          )}
          <button
            className="transcript-toggle"
            onClick={() => setShowTranscript((v) => !v)}
          >
            {showTranscript ? "Hide transcript ▴" : "Read the transcript ▾"}
          </button>
          {showTranscript && <ScriptView script={result.script} casts={casts} />}
        </section>
      )}

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="display">Real Cast Mode</h3>
            <p>
              Real Cast mode generates <em>simulated, fan-made parody scripts</em> in
              the style of real shows. Nothing it outputs was said by, approved
              by, or is affiliated with the actual hosts or podcasts named.
            </p>
            <p>
              It's for personal and educational use while in beta. Don't
              republish these scripts as if they're real quotes.
            </p>
            <div className="modal-actions">
              <button className="decline" onClick={() => setShowModal(false)}>
                Nah
              </button>
              <button className="accept" onClick={acceptRealMode}>
                Understood — let me in
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        A <span>CultureLM</span> product
      </footer>
    </main>
  );
}
