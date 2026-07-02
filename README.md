# CultureLM

Run the news through the culture. Upload any document, pick your show, get the breakdown the way your group chat would explain it.

Next.js app. Server-side Gemini calls (`/api/generate`), client-side PDF text extraction, two persona tiers: original house casts (public) and Real Cast mode (beta, gated behind a parody disclaimer).

## Run locally

```
npm install
cp .env.example .env.local   # add your Gemini API key
npm run dev
```
