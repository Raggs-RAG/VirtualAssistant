// Audio voice casting. Gemini TTS multi-speaker supports exactly two voices
// per request, so every cast is performed by a two-voice "audio booth":
// hosts are assigned alternately to the two voice tracks. Duo shows get one
// true voice per host; 3-4 host shows share the two voices (beta limitation).

export const VOICE_PAIRS = {
  roundtable: ["Charon", "Puck"],
  read: ["Puck", "Kore"],
  throughline: ["Charon", "Kore"],
  morningrush: ["Fenrir", "Kore"],
  game: ["Orus", "Charon"],
  stream: ["Puck", "Zephyr"],
  pourup: ["Fenrir", "Orus"],
};

// Splits a script into [{speaker, text}] turns based on "NAME:" prefixes.
export function parseTurns(script) {
  const turns = [];
  for (const raw of script.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([A-Z][A-Z .'\-]{0,24}):\s*(.*)$/);
    if (m && m[2]) {
      turns.push({ speaker: m[1].trim(), text: m[2] });
    } else if (turns.length) {
      turns[turns.length - 1].text += " " + line;
    }
  }
  return turns;
}

// Maps every host in the cast onto the two audio speaker slots, then
// rewrites the script with only those two labels so the TTS request is
// valid. Returns { transcript, speakers: [{name, voice}] }.
export function buildTtsScript(script, cast, archetypeId) {
  const [voiceA, voiceB] = VOICE_PAIRS[archetypeId] || ["Charon", "Puck"];
  const hosts = cast.hosts.map((h) => h.name.toUpperCase());
  const slotA = hosts[0];
  const slotB = hosts[1] || hosts[0];

  const slotFor = {};
  hosts.forEach((h, i) => {
    slotFor[h] = i % 2 === 0 ? slotA : slotB;
  });

  const turns = parseTurns(script);
  const lines = turns.map((t) => {
    const slot = slotFor[t.speaker.toUpperCase()] || slotA;
    return `${slot}: ${t.text}`;
  });

  return {
    transcript: lines.join("\n"),
    speakers: [
      { name: slotA, voice: voiceA },
      { name: slotB, voice: voiceB },
    ],
  };
}

// Wraps raw 16-bit PCM in a WAV container.
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
