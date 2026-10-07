import { GoogleGenAI } from "@google/genai";
import { getCast } from "../../../lib/personas";
import { studioRequest, cleanStudio } from "../../../lib/studio";

export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_SOURCE_CHARS = 120_000;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const { kind, archetypeId, mode, sourceText } = body || {};
  const castMode = mode === "real" ? "real" : "public";
  if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) {
    return Response.json({ error: "Drop a source first." }, { status: 400 });
  }
  const request = studioRequest(kind, archetypeId, castMode, sourceText.slice(0, MAX_SOURCE_CHARS));
  if (!request) {
    return Response.json({ error: "Pick a show and a format." }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        temperature: 1.0,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: request.schema,
      },
    });
    const cleaned = cleanStudio(kind, JSON.parse(response.text || "{}"), getCast(archetypeId, castMode));
    if (!cleaned) {
      return Response.json({ error: "The studio came back empty. Run it again." }, { status: 502 });
    }
    return Response.json({ kind, ...cleaned });
  } catch (err) {
    console.error("studio failed:", kind, err?.message || err);
    const quota = /quota|rate|429|RESOURCE_EXHAUSTED/i.test(String(err?.message));
    return Response.json(
      {
        error: quota
          ? "Daily quota is tapped — try again shortly."
          : "Something broke in the studio. Try again.",
      },
      { status: 502 }
    );
  }
}
