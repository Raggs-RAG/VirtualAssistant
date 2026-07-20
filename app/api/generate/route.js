import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt, buildUserMessage } from "../../../lib/prompt";
import { getCast } from "../../../lib/personas";

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

  const { archetypeId, mode, sourceText } = body || {};
  const castMode = mode === "real" ? "real" : "public";

  if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) {
    return Response.json({ error: "Drop a source first." }, { status: 400 });
  }

  const systemInstruction = buildSystemPrompt(archetypeId, castMode);
  const cast = getCast(archetypeId, castMode);
  if (!systemInstruction || !cast) {
    return Response.json({ error: "Pick a show." }, { status: 400 });
  }

  const source = sourceText.slice(0, MAX_SOURCE_CHARS);

  if (!process.env.GEMINI_API_KEY) {
    console.error("generate failed: GEMINI_API_KEY is not set in this environment");
    return Response.json(
      { error: "The studio isn't wired up: GEMINI_API_KEY is missing in this deployment's environment." },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildUserMessage(cast.name, source),
      config: {
        systemInstruction,
        temperature: 1.0,
        maxOutputTokens: 4096,
      },
    });

    const script = response.text;
    if (!script) {
      return Response.json(
        { error: "The booth came back empty. Run it again." },
        { status: 502 }
      );
    }
    return Response.json({ script, show: cast.name });
  } catch (err) {
    console.error("generate failed:", err?.message || err);
    return Response.json(
      { error: "Something broke. Try again — the producer is on it." },
      { status: 502 }
    );
  }
}
