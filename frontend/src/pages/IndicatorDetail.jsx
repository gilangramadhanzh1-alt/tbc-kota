import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line } from "recharts";
import { FileSpreadsheet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useFilter } from "@/context/AppContext";
import { PeriodFilter } from "@/components/PeriodFilter";
import ChartCard from "@/components/ChartCard";
import ReportTable from "@/components/ReportTable";
import StatusPill from "@/components/StatusPill";
import DocumentPanel from "@/components/DocumentPanel";
import { fmt, fmtPct, periodLabel, MONTHS_SHORT } from "@/lib/period";
import { exportReportExcel } from "@/lib/exportExcel";

function Stat({ label, value, testid, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`font-mono text-2xl font-bold mt-1 ${accent || "text-slate-900"}`} data-testid={testid}>{value}</div>
    </div>
  );
}

export default function IndicatorDetail() {
  const { id } = useParams();
  const { filter, setFilter } = useFilter();
  const [rep, setRep] = useState(null);
  const [trend, setTrend] = useState([]);
  const unitLabel = filter.unitType === "kelurahan" ? "Kelurahan" : "Faskes";
  const noTarget = filter.unitType === "kelurahan";
  const kelurahanAllowed = ["treatment_coverage", "penemuan_kasus_tb_ro"].includes(id);
  const period = periodLabel(filter.periodType, filter.periodIndex, filter.year);

  useEffect(() => {
    if (filter.unitType === "kelurahan" && !kelurahanAllowed) setFilter({ unitType: "faskes" });
  }, [id, filter.unitType, kelurahanAllowed, setFilter]);

  useEffect(() => {
    api.get("/report", { params: { indicator: id, year: filter.year, unit_type: filter.unitType, period_type: filter.periodType, period_index: filter.periodIndex } }).then((r) => setRep(r.data));
    api.get("/trend", { params: { indicator: id, year: filter.year, unit_type: filter.unitType } }).then((r) => setTrend(r.data.map((t) => ({ ...t, bulan: MONTHS_SHORT[t.month - 1] }))));
  }, [id, filter]);

  if (!rep) return <div className="text-slate-500" data-testid="detail-loading">Memuat data...</div>;
  const { indicator, rows, total } = rep;
  const short = (n) => n.replace(/^KELURAHAN\s+/i, "").replace(/^PUSKESMAS\s+/i, "PKM ");
  const barData = rows.map((r) => ({ name: short(r.unit_name), Target: r.target_angka, Capaian: r.capaian_angka }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rise">
        <div>
          <div className="font-mono text-xs text-amber-600">INDIKATOR {String(indicator.no).padStart(2, "0")} · {indicator.code}</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mt-1" data-testid="indicator-title">{indicator.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{period}</p>
        </div>
        <button onClick={() => exportReportExcel({ indicator, unitLabel, period, rows, total, noTarget })} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors" data-testid="btn-export-excel">
          <FileSpreadsheet className="h-4 w-4" />Export Excel
        </button>
      </header>
      <PeriodFilter showUnit={false} />
      <Tabs value={filter.unitType} onValueChange={(v) => setFilter({ unitType: v })}>
        <TabsList className="bg-slate-200/60">
          {kelurahanAllowed && <TabsTrigger value="kelurahan" data-testid="tab-kelurahan-view">Per Kelurahan</TabsTrigger>}
          <TabsTrigger value="faskes" data-testid="tab-faskes-view">Per Faskes</TabsTrigger>
        </TabsList>
      </Tabs>
      {noTarget ? (
        <section className="grid grid-cols-2 gap-3">
          <Stat label="Total Capaian Angka Kota" value={fmt(total.capaian_angka)} testid="stat-capaian-angka" accent="text-blue-700" />
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-500 flex items-center" data-testid="kelurahan-note">Basis kelurahan tidak memiliki target, hanya capaian angka yang ditampilkan.</div>
        </section>
      ) : (
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Target Angka" value={fmt(total.target_angka)} testid="stat-target-angka" />
        <Stat label="Target %" value={fmtPct(total.target_persen)} testid="stat-target-persen" />
        <Stat label="Total Capaian Angka" value={fmt(total.capaian_angka)} testid="stat-capaian-angka" accent="text-blue-700" />
        <Stat label="Total Capaian %" value={fmtPct(total.capaian_persen)} testid="stat-capaian-persen" accent="text-blue-700" />
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status Kota</div>
          <StatusPill capaian={total.capaian_persen} target={total.target_persen} targetAngka={total.target_angka} testid="stat-status" />
        </div>
      </section>
      )}
      <div className="grid xl:grid-cols-2 gap-6">
        <ChartCard testid="chart-per-unit" title={noTarget ? `Capaian per ${unitLabel}` : `Target vs Capaian per ${unitLabel}`} subtitle={period} filename={`${indicator.code}_per_${unitLabel}_${period.replace(/\s+/g, "_")}`}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ left: -15, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" angle={-55} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend verticalAlign="top" height={28} />
              {!noTarget && <Bar dataKey="Target" fill="#CBD5E1" radius={[3, 3, 0, 0]} />}
              <Bar dataKey="Capaian" fill="#2563EB" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard testid="chart-trend" title="Tren Bulanan & Kumulatif" subtitle={`Tahun ${filter.year} · per ${unitLabel}`} filename={`${indicator.code}_tren_${filter.year}`}>
          <ResponsiveContainer>
            <ComposedChart data={trend} margin={{ left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend verticalAlign="top" height={28} />
              <Bar dataKey="capaian" name="Capaian Bulanan" fill="#D97706" radius={[3, 3, 0, 0]} />
              <Line dataKey="kumulatif" name="Kumulatif" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
              {!noTarget && <Line dataKey="target_kumulatif" name="Target Kumulatif" stroke="#0F172A" strokeDasharray="4 4" strokeWidth={2} dot={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ReportTable rows={rows} total={total} unitLabel={unitLabel} noTarget={noTarget} />
      <DocumentPanel indicator={id} year={filter.year} />
    </div>
  );
}
