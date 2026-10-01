/* Appel Gemini (generateContent) depuis le navigateur, en secours si le serveur Vercel échoue.
   Gemini n’accepte pas additionalProperties dans response_schema : on demande du JSON
   via responseMimeType, le prompt décrit déjà le format, et on vérifie côté client. */
const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"];

export function geminiClientKey() {
  const raw = (import.meta.env.GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY || "") as string;
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

function readText(data: Record<string, unknown>): string {
  const steps = Array.isArray(data.steps) ? data.steps as { type?: string; content?: { text?: string }[] }[] : [];
  const fromSteps = steps.filter((s) => s.type === "model_output" || s.type === "text").flatMap((s) => s.content || []).map((c) => c.text || "").join("");
  if (fromSteps.trim()) return fromSteps;
  const parts = ((data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined) || [])
    .flatMap((c) => c.content?.parts || []).map((p) => p.text || "").join("");
  if (parts.trim()) return parts;
  return typeof data.text === "string" ? data.text : "";
}

export async function generateGeminiJson(key: string, prompt: string, _schema: object, signal?: AbortSignal) {
  const models = [...new Set([((import.meta.env.GEMINI_MODEL as string) || "").trim(), ...MODELS].filter(Boolean))];
  const browser = typeof window !== "undefined";
  let lastErr = "Gemini : aucun modèle n’a répondu";
  let only429 = true;
  for (const model of models) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        signal,
        ...(browser ? {} : { referrerPolicy: "no-referrer" as const }),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
        }),
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      lastErr = e instanceof Error ? e.message : String(e);
      only429 = false;
      continue;
    }
    const raw = await res.text();
    if (res.status === 429) {
      lastErr = `Gemini ${model} 429`;
      continue;
    }
    only429 = false;
    if (!res.ok) {
      lastErr = `Gemini ${model} ${res.status} ${raw.slice(0, 220)}`;
      if (/API[_ ]key|PERMISSION|not valid|referer|blocked/i.test(raw)) throw new Error(lastErr);
      continue;
    }
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(raw) } catch { lastErr = `Gemini ${model} JSON illisible`; continue }
    const text = readText(data);
    if (text.trim()) return text;
    lastErr = `Gemini ${model} réponse vide`;
  }
  const err = new Error(lastErr);
  if (only429) (err as Error & { rateLimited?: boolean }).rateLimited = true;
  throw err;
}

export async function fetchConseil<T>(opts: {
  payload: { answers: unknown } | { sim: unknown };
  prompt: string;
  schema: object;
  parse: (text: string) => T | null;
  signal?: AbortSignal;
}): Promise<{ analysis: T } | { error: string }> {
  try {
    const res = await fetch("/api/conseil", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts.payload),
      signal: opts.signal,
    });
    const j = await res.json().catch(() => ({})) as { analysis?: T; error?: string };
    if (res.ok && j.analysis) return { analysis: j.analysis };
    if (j.error === "disabled") return { error: "disabled" };
    if (res.status === 429 || j.error === "rate_limited") return { error: "rate_limited" };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
  }
  const key = geminiClientKey();
  if (!key) return { error: "default" };
  try {
    const text = await generateGeminiJson(key, opts.prompt, opts.schema, opts.signal);
    const analysis = opts.parse(text);
    if (analysis) return { analysis };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    if ((e as Error & { rateLimited?: boolean }).rateLimited) return { error: "rate_limited" };
  }
  return { error: "default" };
}
