import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AppContext";
import { Field, SimpleSelect } from "@/components/PeriodFilter";
import { MONTHS_SHORT, YEARS, fmt } from "@/lib/period";

const cell = "w-full min-w-[64px] h-8 px-1.5 text-right font-mono text-xs bg-transparent border border-transparent rounded hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none";
const th = "px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap";

export default function AdminInput() {
  const { indicators } = useAuth();
  const [ind, setInd] = useState("spm_terduga");
  const [year, setYear] = useState(new Date().getFullYear());
  const [unitType, setUnitType] = useState("kelurahan");
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const noTarget = unitType === "kelurahan";
  const KEL_IND = ["treatment_coverage", "penemuan_kasus_tb_ro"];
  const indOptions = indicators.filter((i) => !noTarget || KEL_IND.includes(i.id));

  useEffect(() => {
    if (noTarget && !KEL_IND.includes(ind)) setInd("treatment_coverage");
  }, [noTarget, ind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get("/input", { params: { indicator: ind, year, unit_type: unitType } }).then((r) => { setRows(r.data); setDirty(false); }).catch((e) => toast.error(errMsg(e)));
  }, [ind, year, unitType]);

  const update = (i, key, v, m) => {
    const num = v === "" ? 0 : Math.max(0, Number(v));
    setRows((rs) => rs.map((r, j) => (j !== i ? r : key === "months" ? { ...r, months: r.months.map((x, k) => (k === m ? num : x)) } : { ...r, [key]: num })));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/input", { indicator: ind, year, rows: rows.map(({ unit_id, target_angka, target_persen, months }) => ({ unit_id, target_angka, target_persen, months })) });
      toast.success("Data berhasil disimpan");
      setDirty(false);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  };

  const colTotal = (m) => rows.reduce((s, r) => s + r.months[m], 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Admin</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">Input Target & Capaian</h1>
          <p className="text-sm text-slate-500 mt-1">{noTarget ? "Basis kelurahan tanpa target: isi capaian angka per bulan untuk Treatment Coverage dan Penemuan Kasus TB RO." : "Isi target tahunan dan capaian per bulan. Triwulan, semester dan tahunan dihitung otomatis."}</p>
        </div>
        <button onClick={save} disabled={saving || !dirty} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors" data-testid="btn-save-input">
          <Save className="h-4 w-4" />{saving ? "Menyimpan..." : dirty ? "Simpan Perubahan" : "Tersimpan"}
        </button>
      </header>
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4">
        <Field label="Indikator"><SimpleSelect testid="input-indicator-select" value={ind} onChange={setInd} options={indOptions.map((i) => ({ value: i.id, label: `${i.no}. ${i.name}` }))} className="min-w-[300px]" /></Field>
        <Field label="Tahun"><SimpleSelect testid="input-year-select" value={year} onChange={(v) => setYear(Number(v))} options={YEARS.map((y) => ({ value: y, label: String(y) }))} /></Field>
        <Field label="Basis Data"><SimpleSelect testid="input-unit-select" value={unitType} onChange={setUnitType} options={[{ value: "kelurahan", label: "Per Kelurahan" }, { value: "faskes", label: "Per Faskes" }]} /></Field>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white max-h-[70vh]" data-testid="input-grid">
        <table className="text-sm w-full">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className={`${th} text-left sticky left-0 bg-slate-50 min-w-[220px]`}>{unitType === "kelurahan" ? "Kelurahan" : "Faskes"}</th>
              {!noTarget && <th className={`${th} bg-blue-50 text-blue-800`}>Target Thn</th>}
              {!noTarget && <th className={`${th} bg-blue-50 text-blue-800`}>Target %</th>}
              {MONTHS_SHORT.map((m) => <th key={m} className={th}>{m}</th>)}
              <th className={`${th} bg-amber-50 text-amber-800`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.unit_id} className="border-b border-slate-100 hover:bg-slate-50/60" data-testid={`input-row-${i}`}>
                <td className="px-2 py-1 text-xs font-medium sticky left-0 bg-white">{r.unit_name}</td>
                {!noTarget && <td className="px-1 bg-blue-50/40"><input type="number" min="0" className={cell} value={r.target_angka} onChange={(e) => update(i, "target_angka", e.target.value)} data-testid={`input-target-angka-${i}`} /></td>}
                {!noTarget && <td className="px-1 bg-blue-50/40"><input type="number" min="0" className={cell} value={r.target_persen} onChange={(e) => update(i, "target_persen", e.target.value)} data-testid={`input-target-persen-${i}`} /></td>}
                {r.months.map((v, m) => (
                  <td key={m} className="px-1"><input type="number" min="0" className={cell} value={v} onChange={(e) => update(i, "months", e.target.value, m)} data-testid={`input-capaian-${i}-${m + 1}`} /></td>
                ))}
                <td className="px-2 text-right font-mono text-xs font-bold bg-amber-50/50" data-testid={`input-row-total-${i}`}>{fmt(r.months.reduce((a, b) => a + b, 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0">
            <tr className="bg-slate-900 text-white font-mono text-xs">
              <td className="px-2 py-2.5 font-heading font-bold uppercase sticky left-0 bg-slate-900">{noTarget ? "Total" : "Target Kota / Total"}</td>
              {!noTarget && <td className="px-2 text-right" data-testid="input-total-target">{fmt(rows.reduce((s, r) => s + r.target_angka, 0))}</td>}
              {!noTarget && <td />}
              {MONTHS_SHORT.map((m, k) => <td key={m} className="px-2 text-right">{fmt(colTotal(k))}</td>)}
              <td className="px-2 text-right text-amber-300 font-bold" data-testid="input-grand-total">{fmt(rows.reduce((s, r) => s + r.months.reduce((a, b) => a + b, 0), 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
