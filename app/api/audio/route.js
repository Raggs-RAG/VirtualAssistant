import { GoogleGenAI } from "@google/genai";
import { getCast } from "../../../lib/personas";
import { buildTtsScript, pcmToWav } from "../../../lib/audio";

export const maxDuration = 300;

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const MAX_SCRIPT_CHARS = 9000;

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

  const { transcript, speakers } = buildTtsScript(
    script.slice(0, MAX_SCRIPT_CHARS),
    cast,
    archetypeId
  );

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: `TTS the following podcast conversation. Deliver it with real energy — animated, conversational, hosts talking like they're in the room together, not reading:\n\n${transcript}`,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.map((s) => ({
              speaker: s.name,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } },
            })),
          },
        },
      },
    });

    const b64 =
      response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
        ?.inlineData?.data;
    if (!b64) {
      return Response.json(
        { error: "The booth came back silent. Run it again." },
        { status: 502 }
      );
    }

    const wav = pcmToWav(Buffer.from(b64, "base64"));

    // Stream the WAV out in chunks to stay clear of buffered-response limits.
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
          ? "Audio quota is tapped for now — try again in a minute (free tier is limited)."
          : "Audio generation broke. Try again — the producer is on it.",
      },
      { status: 502 }
    );
  }
}
