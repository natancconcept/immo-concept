export const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
export const shek = (n: number) => fmt(n) + " ₪";
export const shekK = (n: number) =>
  n >= 1e6 ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n / 1e6) + " M ₪" : fmt(n) + " ₪";
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
