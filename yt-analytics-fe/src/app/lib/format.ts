// src/lib/format.ts
export const formatNumber = (n: number | string | null | undefined) => {
  if (n == null) return "-";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
};
  
  export const formatPercent = (f: number | null | undefined) => {
    if (f == null) return "-";
    return `${(f * 100).toFixed(2)}%`; // backend sends fraction 0..1
  };
  
  export const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(+d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };
  
  // ISO8601 duration (e.g., PT12M30S) -> mm:ss or h:mm:ss
  export const formatISODuration = (iso: string | null | undefined) => {
    if (!iso) return "-";
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return iso;
    const h = Number(m[1] || 0), min = Number(m[2] || 0), s = Number(m[3] || 0);
    const pad = (x: number) => x.toString().padStart(2, "0");
    return h ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`;
  };
  