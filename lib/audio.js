// Audio voice casting — the 4-voice engine.
//
// Gemini TTS allows at most two voices per request, so full-cast episodes
// are synthesized as a sequence of chunks: consecutive turns are grouped
// while they involve at most two distinct hosts, each chunk is rendered
// with those hosts' dedicated voices, and the PCM is stitched into one
// episode. Every host keeps one unique voice across the whole episode.
// Duo and solo shows naturally collapse into a single chunk/request.

export const VOICE_SETS = {
  roundtable: ["Charon", "Puck", "Alnilam", "Umbriel"],
  read: ["Puck", "Kore"],
  throughline: ["Charon", "Kore"],
  morningrush: ["Fenrir", "Achird", "Kore"],
  game: ["Orus", "Gacrux"],
  stream: ["Puck", "Zephyr"],
  speed: ["Fenrir", "Leda"],
  pourup: ["Fenrir", "Orus"],
};

// If a script would need more chunks than this, host voices are folded
// down to two tracks so the episode stays one request (cost/time guard).
export const MAX_CHUNKS = 24;

export function parseTurns(script) {
  const turns = [];
  for (const raw of script.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([A-Z][A-Z .'\-]{0,24}):\s*(.*)$/);
    if (m && m[2]) {
      turns.push({ speaker: m[1].trim().toUpperCase(), text: m[2] });
    } else if (turns.length) {
      turns[turns.length - 1].text += " " + line;
    }
  }
  return turns;
}

function voiceMapFor(cast, archetypeId, foldToTwo) {
  const voices = VOICE_SETS[archetypeId] || ["Charon", "Puck"];
  const map = {};
  cast.hosts.forEach((h, i) => {
    const idx = foldToTwo ? i % 2 : Math.min(i, voices.length - 1);
    map[h.name.toUpperCase()] = voices[idx];
  });
  return map;
}

function groupTurns(turns) {
  const chunks = [];
  let cur = null;
  for (const t of turns) {
    if (cur && (cur.speakers.has(t.speaker) || cur.speakers.size < 2)) {
      cur.turns.push(t);
      cur.speakers.add(t.speaker);
    } else {
      if (cur) chunks.push(cur);
      cur = { turns: [t], speakers: new Set([t.speaker]) };
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Returns [{ transcript, speakers: [{name, voice}] }] — one entry per
// TTS request. Unknown speakers fall back to the first host's voice.
export function buildChunks(script, cast, archetypeId) {
  const turns = parseTurns(script);
  const known = new Set(cast.hosts.map((h) => h.name.toUpperCase()));
  const fallback = cast.hosts[0].name.toUpperCase();
  for (const t of turns) if (!known.has(t.speaker)) t.speaker = fallback;

  let chunks = groupTurns(turns);
  const foldToTwo = chunks.length > MAX_CHUNKS;
  const vmap = voiceMapFor(cast, archetypeId, foldToTwo);
  if (foldToTwo) {
    // Two voice tracks means every pair of speakers fits in one chunk set:
    // relabel speakers by their track so grouping collapses aggressively.
    const trackName = {};
    for (const name of Object.keys(vmap)) {
      trackName[name] = Object.keys(vmap).find((n) => vmap[n] === vmap[name]);
    }
    for (const t of turns) t.speaker = trackName[t.speaker];
    chunks = groupTurns(turns);
  }

  return chunks.map((c) => ({
    transcript: c.turns.map((t) => `${t.speaker}: ${t.text}`).join("\n"),
    speakers: [...c.speakers].map((name) => ({ name, voice: vmap[name] })),
  }));
}

export function pcmToWav(pcm, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
