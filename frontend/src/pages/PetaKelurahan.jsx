import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useFilter } from "@/context/AppContext";
import { PeriodFilter, Field, SimpleSelect } from "@/components/PeriodFilter";
import ChartCard from "@/components/ChartCard";
import { fmt, periodLabel } from "@/lib/period";
import { KECAMATAN, kelKey, heatColor } from "@/lib/kecamatan";

const IND = [{ value: "treatment_coverage", label: "2. Treatment Coverage" }, { value: "penemuan_kasus_tb_ro", label: "5. Penemuan Kasus TB RO" }];

function Tile({ r, max, i }) {
  const bg = heatColor(r.capaian_angka, max);
  const dark = r.capaian_angka && r.capaian_angka / max > 0.4;
  return (
    <Link to={`/indikator/${r.ind}`} title={`${r.unit_name}: ${fmt(r.capaian_angka)} kasus`} className="rise rounded-lg p-3 min-h-[76px] flex flex-col justify-between border border-black/5 hover:scale-[1.03] hover:shadow-md transition-[transform,box-shadow]" style={{ background: bg, animationDelay: `${i * 20}ms` }} data-testid={`peta-tile-${kelKey(r.unit_name).replace(/\s+/g, "-").toLowerCase()}`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wide leading-tight ${dark ? "text-white" : "text-slate-700"}`}>{kelKey(r.unit_name)}</span>
      <span className={`font-mono text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>{fmt(r.capaian_angka)}</span>
    </Link>
  );
}

export default function PetaKelurahan() {
  const { filter } = useFilter();
  const [ind, setInd] = useState("treatment_coverage");
  const [rows, setRows] = useState([]);
  const period = periodLabel(filter.periodType, filter.periodIndex, filter.year);

  useEffect(() => {
    api.get("/report", { params: { indicator: ind, year: filter.year, unit_type: "kelurahan", period_type: filter.periodType, period_index: filter.periodIndex } })
      .then((r) => setRows(r.data.rows.filter((x) => !x.luar_kota).map((x) => ({ ...x, ind }))));
  }, [ind, filter]);

  const byKey = useMemo(() => Object.fromEntries(rows.map((r) => [kelKey(r.unit_name), r])), [rows]);
  const max = Math.max(1, ...rows.map((r) => r.capaian_angka));
  const total = rows.reduce((s, r) => s + r.capaian_angka, 0);
  const top = [...rows].sort((a, b) => b.capaian_angka - a.capaian_angka).slice(0, 5);
  const mapped = new Set(KECAMATAN.flatMap((k) => k.kel));
  const unmapped = rows.filter((r) => !mapped.has(kelKey(r.unit_name)));

  return (
    <div className="space-y-6">
      <header className="rise">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Sebaran Wilayah</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mt-1" data-testid="peta-title">Peta Kelurahan</h1>
        <p className="text-sm text-slate-500 mt-1">Warna lebih gelap = kasus lebih banyak · {period}</p>
      </header>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[300px]"><PeriodFilter showUnit={false} /></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200"><Field label="Indikator"><SimpleSelect testid="peta-indicator-select" value={ind} onChange={setInd} options={IND} className="min-w-[240px]" /></Field></div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 text-white rounded-xl p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Total Kota (33 kelurahan)</div><div className="font-mono text-3xl font-bold mt-1 text-amber-300" data-testid="peta-total">{fmt(total)}</div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-2">5 Kelurahan Tertinggi</div>
          <div className="flex flex-wrap gap-2" data-testid="peta-top5">
            {top.map((r, i) => <span key={r.unit_id} className="inline-flex items-center gap-2 text-xs rounded-full pl-1 pr-3 py-1 border border-slate-200"><span className="h-5 w-5 rounded-full grid place-items-center font-mono text-[10px] text-white" style={{ background: heatColor(r.capaian_angka, max) }}>{i + 1}</span>{kelKey(r.unit_name)} <b className="font-mono">{fmt(r.capaian_angka)}</b></span>)}
          </div>
        </div>
      </div>
      <ChartCard testid="peta-map" title={`Sebaran ${IND.find((x) => x.value === ind)?.label.replace(/^\d+\.\s*/, "")} per Kelurahan`} subtitle={`${period} · dikelompokkan per kecamatan`} filename={`Peta_${ind}_${period.replace(/\s+/g, "_")}`} height="auto">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 pt-2">
          {KECAMATAN.map((k) => (
            <div key={k.name} className="rounded-xl border border-slate-200 p-3 bg-slate-50/60" data-testid={`peta-kecamatan-${k.name.replace(/\s+/g, "-").toLowerCase()}`}>
              <div className="flex items-baseline justify-between mb-2"><span className="font-heading font-semibold text-sm">Kec. {k.name}</span><span className="font-mono text-xs text-slate-500">{fmt(k.kel.reduce((s, n) => s + (byKey[n]?.capaian_angka || 0), 0))}</span></div>
              <div className="grid grid-cols-2 gap-2">
                {k.kel.map((n, i) => byKey[n] ? <Tile key={n} r={byKey[n]} max={max} i={i} /> : <div key={n} className="rounded-lg p-3 min-h-[76px] border border-dashed border-slate-200 text-[10px] text-slate-400 uppercase">{n}</div>)}
              </div>
            </div>
          ))}
          {unmapped.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60"><div className="font-heading font-semibold text-sm mb-2">Lainnya</div>
              <div className="grid grid-cols-2 gap-2">{unmapped.map((r, i) => <Tile key={r.unit_id} r={r} max={max} i={i} />)}</div></div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500"><span>0</span>{["#F1F5F9", "#FEF3C7", "#FCD34D", "#F59E0B", "#DC2626", "#7F1D1D"].map((c) => <span key={c} className="h-3 w-8 rounded-sm" style={{ background: c }} />)}<span>{fmt(max)} kasus</span></div>
      </ChartCard>
    </div>
  );
}
