import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { FileSpreadsheet, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { useFilter } from "@/context/AppContext";
import { PeriodFilter } from "@/components/PeriodFilter";
import ChartCard from "@/components/ChartCard";
import ReportTable from "@/components/ReportTable";
import { statusColor } from "@/components/StatusPill";
import { fmt, fmtPct, periodLabel, status } from "@/lib/period";
import { exportSummaryExcel } from "@/lib/exportExcel";

function Delta({ now, before, pct: isPct, year, id }) {
  const d = now - (before || 0);
  const cls = d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-slate-400";
  return <span className={`font-mono text-[11px] ${cls}`} data-testid={`indicator-card-${id}-delta`}>{d > 0 ? "+" : ""}{isPct ? `${Number(d).toLocaleString("id-ID", { maximumFractionDigits: 1 })} poin` : fmt(d)} vs {year - 1}</span>;
}

function KpiCard({ d, i, noTarget, year, prev }) {
  const s = status(d.capaian_persen, d.target_persen, d.target_angka);
  const w = Math.min(100, d.capaian_persen);
  if (noTarget) return (
    <Link to={`/indikator/${d.id}`} className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-900 hover:-translate-y-0.5 transition-[transform,border-color] rise" style={{ animationDelay: `${i * 40}ms` }} data-testid={`indicator-card-${d.id}`}>
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{d.code}</span>
        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
      </div>
      <div className="mt-3 text-sm font-medium text-slate-700 min-h-[40px]">{d.no}. {d.name}</div>
      <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900" data-testid={`indicator-card-${d.id}-angka`}>{fmt(d.capaian_angka)}</div>
      <div className="mt-2 text-[11px] text-slate-500 flex justify-between"><span>Total capaian kota (kasus)</span><Delta now={d.capaian_angka} before={prev?.capaian_angka} year={year} id={d.id} /></div>
    </Link>
  );
  return (
    <Link to={`/indikator/${d.id}`} className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-900 hover:-translate-y-0.5 transition-[transform,border-color] rise" style={{ animationDelay: `${i * 40}ms` }} data-testid={`indicator-card-${d.id}`}>
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{d.code}</span>
        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
      </div>
      <div className="mt-3 text-sm font-medium text-slate-700 min-h-[40px]">{d.no}. {d.name}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="font-mono text-3xl font-bold tracking-tight" style={{ color: statusColor(s) === "#94A3B8" ? "#0F172A" : statusColor(s) }} data-testid={`indicator-card-${d.id}-persen`}>{fmtPct(d.capaian_persen)}</span>
        <Delta now={d.capaian_persen} before={prev?.capaian_persen} pct year={year} id={d.id} />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${w}%`, background: statusColor(s) }} /></div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500 font-mono">
        <span>{fmt(d.capaian_angka)} / {fmt(d.target_angka)}</span><span>target {fmtPct(d.target_persen)}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px]">
        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Target Kota {year}</span>
        <span className="font-mono font-semibold text-slate-800" data-testid={`indicator-card-${d.id}-target-kota`}>{fmt(d.target_tahunan)}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { filter } = useFilter();
  const [data, setData] = useState([]);
  const [prev, setPrev] = useState({});
  const unitLabel = filter.unitType === "kelurahan" ? "Kelurahan" : "Faskes";
  const period = periodLabel(filter.periodType, filter.periodIndex, filter.year);

  useEffect(() => {
    const p = { unit_type: filter.unitType, period_type: filter.periodType, period_index: filter.periodIndex };
    api.get("/summary", { params: { year: filter.year, ...p } }).then((r) => setData(r.data));
    api.get("/summary", { params: { year: filter.year - 1, ...p } }).then((r) => setPrev(Object.fromEntries(r.data.map((d) => [d.id, d])))).catch(() => setPrev({}));
  }, [filter]);

  const noTarget = filter.unitType === "kelurahan";
  const chart = data.map((d) => ({ name: d.code, capaian: noTarget ? d.capaian_angka : d.capaian_persen, s: status(d.capaian_persen, d.target_persen, d.target_angka) }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 rise">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Dinas Kesehatan · Program TBC</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mt-2">Data TBC Kota Sukabumi</h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">Rekap {data.length} indikator · {period} · basis {unitLabel}</p>
        </div>
        <button onClick={() => exportSummaryExcel({ data, period, unitLabel, noTarget, year: filter.year })} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors" data-testid="btn-export-summary-excel">
          <FileSpreadsheet className="h-4 w-4" />Export Excel
        </button>
      </header>
      <PeriodFilter />
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="kpi-grid">
        {data.map((d, i) => <KpiCard key={d.id} d={d} i={i} noTarget={noTarget} year={filter.year} prev={prev[d.id]} />)}
      </section>
      {noTarget && <p className="text-xs text-slate-500 -mt-4" data-testid="kelurahan-note">Basis kelurahan tidak memiliki target; hanya menampilkan capaian angka untuk Treatment Coverage dan Penemuan Kasus TB RO.</p>}
      <ChartCard testid="chart-summary" title={noTarget ? "Capaian (Angka) per Indikator" : "Capaian (%) per Indikator"} subtitle={`${period} · ${unitLabel}`} filename={`Rekap_Capaian_${period.replace(/\s+/g, "_")}`}>
        <ResponsiveContainer>
          <BarChart data={chart} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <YAxis tick={{ fontSize: 11 }} unit={noTarget ? "" : "%"} />
            <Tooltip formatter={(v) => (noTarget ? fmt(v) : fmtPct(v))} />
            {!noTarget && <ReferenceLine y={100} stroke="#0F172A" strokeDasharray="4 4" />}
            <Bar dataKey="capaian" name="Capaian" radius={[4, 4, 0, 0]}>
              {chart.map((c) => <Cell key={c.name} fill={noTarget ? "#2563EB" : statusColor(c.s) === "#94A3B8" ? "#CBD5E1" : statusColor(c.s)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div>
        <h2 className="font-heading text-lg font-semibold mb-3">Rekap Total Capaian Kota</h2>
        <ReportTable rows={data} unitLabel="Indikator" showLinks noTarget={noTarget} showTargetKota={!noTarget} year={filter.year} />
      </div>
    </div>
  );
}
