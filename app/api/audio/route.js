import { GoogleGenAI } from "@google/genai";
import { getCast } from "../../../lib/personas";
import { buildChunks, pcmToWav } from "../../../lib/audio";

export const maxDuration = 300;

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const MAX_SCRIPT_CHARS = 9000;

const STYLE_PROMPT =
  "TTS the following podcast conversation. Deliver it with real energy — " +
  "animated, conversational, hosts talking like they're in the room " +
  "together, not reading:\n\n";

function speechConfigFor(speakers) {
  if (speakers.length === 1) {
    return {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: speakers[0].voice } },
    };
  }
  return {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: speakers.map((s) => ({
        speaker: s.name,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } },
      })),
    },
  };
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const { script, archetypeId, mode } = body || {};
  const castMode = mode === "real" ? "real" : "public";
  const cast = getCast(archetypeId, castMode);

  if (!script || typeof script !== "string" || !script.trim() || !cast) {
    return Response.json({ error: "Need a script and a show." }, { status: 400 });
  }

  const chunks = buildChunks(script.slice(0, MAX_SCRIPT_CHARS), cast, archetypeId);
  if (!chunks.length) {
    return Response.json({ error: "Nothing to record." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const synthesize = async (chunk) => {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: STYLE_PROMPT + chunk.transcript,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: speechConfigFor(chunk.speakers),
      },
    });
    const cand = response.candidates?.[0];
    const b64 = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!b64) {
      console.error(
        "tts empty:",
        JSON.stringify({
          finishReason: cand?.finishReason,
          promptFeedback: response.promptFeedback,
          speakers: chunk.speakers,
        })
      );
    }
    return { b64, finishReason: cand?.finishReason };
  };

  try {
    const parts = [];
    for (const chunk of chunks) {
      let { b64, finishReason } = await synthesize(chunk);
      if (!b64 && !/SAFETY|PROHIBITED/i.test(String(finishReason))) {
        ({ b64, finishReason } = await synthesize(chunk));
      }
      if (!b64) {
        const flagged = /SAFETY|PROHIBITED/i.test(String(finishReason));
        return Response.json(
          {
            error: flagged
              ? "The booth flagged this script's content. Hit Run It Back for a fresh script, then try audio again."
              : "The booth came back silent. Run it again.",
          },
          { status: 502 }
        );
      }
      parts.push(Buffer.from(b64, "base64"));
    }

    const wav = pcmToWav(Buffer.concat(parts));

    const CHUNK = 256 * 1024;
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < wav.length; i += CHUNK) {
          controller.enqueue(wav.subarray(i, i + CHUNK));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("audio failed:", err?.message || err);
    const quota = /quota|rate|429|RESOURCE_EXHAUSTED/i.test(String(err?.message));
    return Response.json(
      {
        error: quota
          ? "Audio quota is tapped — full-cast episodes use several voice calls. Check billing on your Google AI account or try again shortly."
          : "Audio generation broke. Try again — the producer is on it.",
      },
      { status: 502 }
    );
  }
}
