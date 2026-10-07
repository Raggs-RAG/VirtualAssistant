import { Type } from "@google/genai";
import { getArchetype, getCast } from "./personas";

// The Studio turns one source into culture-native formats — the CultureLM
// answer to NotebookLM's infographics, reports, and video overviews.

export const MEME_FORMATS = ["drake", "nobody", "pov", "brain", "post"];

function voiceBlock(archetypeId, mode) {
  const arch = getArchetype(archetypeId);
  const cast = getCast(archetypeId, mode);
  const roster = cast.hosts.map((h) => `- ${h.name}: ${h.role}`).join("\n");
  const identity =
    mode === "real"
      ? `Write in the style of ${cast.name}. This is fan-made parody/commentary, not affiliated with or endorsed by the real hosts.`
      : `Write in the voice of ${cast.name}, an original CultureLM cast. Never name a real podcast or real host.`;
  return `You are CultureLM: you translate dense source material for Black American, hip-hop-culture-fluent audiences. Accuracy first — every fact, number, and claim must come from the source — then make it land.

${identity}

CAST:
${roster}

SHOW DYNAMICS:
${arch.dynamics}

DIALECT AND REGISTER:
${arch.dialect}

AAVE and hip-hop register used fluently, never as costume. Funny, sharp, never corny.`;
}

const TASKS = {
  memes: {
    instructions: `TASK: Make 4 memes that each teach ONE real point from the source — the meme is the lesson. Use a different format for each, chosen from:
- "drake": panels[0] = the wrong/common take (rejected), panels[1] = the right take from the source (approved).
- "nobody": panels[0] = "Nobody:", panels[1] = "Me after reading <topic>:", panels[2] = the reaction line.
- "pov": panels[0] = a "POV: ..." setup line rooted in a source fact, panels[1] = the punchline.
- "brain": 4 panels, escalating from basic to galaxy-brain understanding of a source concept.
- "post": panels[0] = a viral-style post (under 240 chars) from the show's voice, panels[1] = a reply that clowns or co-signs it.
Each panel max 90 characters. Pick one fitting emoji per panel. "fact" = the plain-English fact the meme teaches (max 120 chars).`,
    schema: {
      type: Type.OBJECT,
      properties: {
        memes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              format: { type: Type.STRING, enum: MEME_FORMATS },
              panels: { type: Type.ARRAY, items: { type: Type.STRING } },
              emojis: { type: Type.ARRAY, items: { type: Type.STRING } },
              fact: { type: Type.STRING },
            },
            required: ["format", "panels", "emojis", "fact"],
          },
        },
      },
      required: ["memes"],
    },
  },

  post: {
    instructions: `TASK: Write "The Post" — the report, but as a viral thread. 6 to 8 posts, each under 270 characters. Post 1 is a scroll-stopping hook. The middle posts deliver the source's actual substance — key facts, numbers, why it matters — one idea per post. The last post is the takeaway plus a call to action. No hashtags spam (max 2 in the whole thread). Also give a 1-line headline (max 70 chars).`,
    schema: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        posts: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["headline", "posts"],
    },
  },

  short: {
    instructions: `TASK: Write a 30-40 second short-form vertical video script ("brainrot" format: fast, punchy, captions-first). 8 to 12 lines, 90-120 words total. Line 1 is a hook that stops the scroll. Every line is short and quotable. Teach the single most important idea from the source with one real fact or number. End on a line that makes people rewatch or comment. Use only these speakers: the first two cast members listed (by their exact names). Also give a title (max 40 chars).`,
    schema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        lines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["speaker", "text"],
          },
        },
      },
      required: ["title", "lines"],
    },
  },
};

export function studioRequest(kind, archetypeId, mode, sourceText) {
  const task = TASKS[kind];
  if (!task || !getCast(archetypeId, mode)) return null;
  return {
    systemInstruction: `${voiceBlock(archetypeId, mode)}\n\n${task.instructions}`,
    contents: `SOURCE:\n${sourceText}`,
    schema: task.schema,
  };
}

// Normalizes model output so the client can trust the shape.
export function cleanStudio(kind, data, cast) {
  if (kind === "memes") {
    const memes = (data.memes || [])
      .filter((m) => MEME_FORMATS.includes(m.format) && m.panels?.length)
      .slice(0, 4)
      .map((m) => ({
        format: m.format,
        panels: m.panels.map((p) => String(p).slice(0, 240)),
        emojis: m.emojis || [],
        fact: String(m.fact || "").slice(0, 160),
      }));
    return memes.length ? { memes } : null;
  }
  if (kind === "post") {
    const posts = (data.posts || []).map(String).filter(Boolean).slice(0, 10);
    return posts.length ? { headline: String(data.headline || ""), posts } : null;
  }
  if (kind === "short") {
    const names = cast.hosts.slice(0, 2).map((h) => h.name.toUpperCase());
    const lines = (data.lines || [])
      .filter((l) => l.text)
      .slice(0, 14)
      .map((l, i) => {
        const sp = String(l.speaker || "").toUpperCase();
        return { speaker: names.includes(sp) ? sp : names[i % names.length], text: String(l.text) };
      });
    return lines.length ? { title: String(data.title || ""), lines } : null;
  }
  return null;
}
