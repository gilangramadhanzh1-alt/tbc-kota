export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const PERIOD_TYPES = [
  { value: "bulan", label: "Bulanan" },
  { value: "triwulan", label: "Triwulan" },
  { value: "semester", label: "Semester" },
  { value: "tahunan", label: "Tahunan" },
];

export function periodOptions(type) {
  if (type === "bulan") return MONTHS.map((m, i) => ({ value: i + 1, label: m }));
  if (type === "triwulan") return [1, 2, 3, 4].map((i) => ({ value: i, label: `Triwulan ${["I", "II", "III", "IV"][i - 1]}` }));
  if (type === "semester") return [1, 2].map((i) => ({ value: i, label: `Semester ${i === 1 ? "I" : "II"}` }));
  return [{ value: 1, label: "Setahun penuh" }];
}

export function periodLabel(type, idx, year) {
  if (type === "tahunan") return `Tahun ${year}`;
  const o = periodOptions(type).find((x) => x.value === idx);
  return `${o?.label || ""} ${year}`;
}

const thisYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 7 }, (_, i) => thisYear - 4 + i);

export const fmt = (n) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
export const fmtPct = (n) => `${Number(n || 0).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

export function status(capaianPersen, targetPersen, targetAngka) {
  if (!targetAngka) return "none";
  if (capaianPersen >= targetPersen) return "ok";
  if (capaianPersen >= targetPersen * 0.8) return "near";
  return "low";
}
