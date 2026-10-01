/* Appel du serveur /api/conseil depuis le questionnaire et le simulateur. */
export async function fetchConseil<T>(opts: {
  payload: { answers: unknown } | { sim: unknown };
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
    return { error: j.error || "default" };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return { error: "default" };
  }
}
