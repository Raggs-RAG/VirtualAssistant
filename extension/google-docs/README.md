# CultureLM for Google Docs

Sidebar add-on: open any Google Doc → CultureLM menu → Run the Breakdown →
the doc becomes an episode (script + audio) without leaving Docs.

## Install for yourself (5 minutes, no marketplace needed)

1. Open any Google Doc
2. **Extensions → Apps Script** — a script editor opens bound to that doc
   (for an add-on usable in EVERY doc, instead go to **script.google.com →
   New project**, and follow the same steps)
3. Replace the default `Code.gs` contents with this folder's `Code.gs`
4. **+ → HTML** file, name it `Sidebar`, paste in `Sidebar.html`
5. Project Settings (gear) → check **Show "appsscript.json"** → replace its
   contents with this folder's `appsscript.json`
6. Save, reload the Doc — a **CultureLM** menu appears
7. First run asks for authorization (reads the current doc, calls the
   CultureLM API) — approve it

## Publish to the Workspace Marketplace (when ready)

Requires: a Google Cloud project, OAuth consent screen with CultureLM
branding, and Marketplace review (days to weeks). Do this after the brand
assets are final. Docs: https://developers.google.com/workspace/marketplace

## Notes

- The sidebar uses the public House Casts. Real Cast mode stays web-only.
- Long episodes exceed the sidebar's transfer limit; the sidebar links to
  the web app for full audio in that case.
- The API base is `https://culturelm.vercel.app` — update `API_BASE` in
  `Code.gs` if the domain changes (e.g. culturelm.com).
