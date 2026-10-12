import { status } from "@/lib/period";

const STYLES = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  near: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-rose-50 text-rose-700 border-rose-200",
  none: "bg-slate-50 text-slate-500 border-slate-200",
};
const LABELS = { ok: "Tercapai", near: "Mendekati", low: "Di bawah target", none: "Belum ada target" };

export function statusColor(s) {
  return { ok: "#16A34A", near: "#D97706", low: "#E11D48", none: "#94A3B8" }[s];
}

export default function StatusPill({ capaian, target, targetAngka, testid }) {
  const s = status(capaian, target, targetAngka);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${STYLES[s]}`} data-testid={testid}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor(s) }} />
      {LABELS[s]}
    </span>
  );
}
