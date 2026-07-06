// Client-side text extraction for every supported source file type.
// Everything runs in the browser so there are no server upload limits.

async function extractPdf(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str).join(" ") + "\n\n";
  }
  return out;
}

async function extractDocx(file) {
  const mammoth = (await import("mammoth/mammoth.browser")).default ||
    (await import("mammoth/mammoth.browser"));
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function extractHtml(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  doc.querySelectorAll("script,style,nav,footer,noscript").forEach((el) =>
    el.remove()
  );
  return doc.body?.innerText || doc.documentElement.textContent || "";
}

function extractRtf(text) {
  return text
    .replace(/\\par[d]?/g, "\n")
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, "")
    .replace(/[{}]/g, "")
    .trim();
}

const EXT = (name) => (name.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();

export const ACCEPT =
  ".pdf,.docx,.txt,.md,.markdown,.html,.htm,.csv,.tsv,.json,.rtf";

export const TYPE_LABEL = "PDF, Word (.docx), HTML, CSV, JSON, RTF, or text";

export async function extractText(file) {
  const ext = EXT(file.name);

  if (ext === "pdf" || file.type === "application/pdf") {
    return (await extractPdf(file)).trim();
  }
  if (
    ext === "docx" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return (await extractDocx(file)).trim();
  }

  const text = await file.text();
  if (ext === "html" || ext === "htm" || file.type === "text/html") {
    return extractHtml(text).trim();
  }
  if (ext === "rtf") {
    return extractRtf(text);
  }
  // txt, md, csv, tsv, json and anything else that reads as plain text
  return text.trim();
}
