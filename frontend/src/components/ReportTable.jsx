import { Link } from "react-router-dom";
import { fmt, fmtPct } from "@/lib/period";
import StatusPill from "@/components/StatusPill";

const th = "px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap";
const td = "px-3 py-2.5 font-mono text-right whitespace-nowrap";

export default function ReportTable({ rows, total, unitLabel, showLinks = false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" data-testid="report-table">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className={`${th} text-left w-10`}>No</th>
            <th className={`${th} text-left`}>{unitLabel}</th>
            <th className={`${th} text-right`}>Target Angka</th>
            <th className={`${th} text-right`}>Target %</th>
            <th className={`${th} text-right`}>Capaian Angka</th>
            <th className={`${th} text-right`}>Capaian %</th>
            <th className={`${th} text-left`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.unit_id || r.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors" data-testid={`report-row-${i}`}>
              <td className="px-3 py-2.5 text-slate-400 font-mono text-xs">{r.no || i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-slate-800">
                {showLinks ? <Link to={`/indikator/${r.id}`} className="hover:text-blue-600 hover:underline" data-testid={`report-link-${r.id}`}>{r.name}</Link> : r.unit_name || r.name}
              </td>
              <td className={td}>{fmt(r.target_angka)}</td>
              <td className={`${td} text-slate-500`}>{fmtPct(r.target_persen)}</td>
              <td className={`${td} font-semibold text-slate-900`}>{fmt(r.capaian_angka)}</td>
              <td className={`${td} font-semibold`}>{fmtPct(r.capaian_persen)}</td>
              <td className="px-3 py-2.5"><StatusPill capaian={r.capaian_persen} target={r.target_persen} targetAngka={r.target_angka} testid={`report-status-${i}`} /></td>
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="bg-slate-900 text-white" data-testid="report-total-row">
              <td />
              <td className="px-3 py-3 font-heading font-bold text-xs uppercase tracking-wider">Total Capaian Kota</td>
              <td className={td} data-testid="total-target-angka">{fmt(total.target_angka)}</td>
              <td className={`${td} text-slate-300`} data-testid="total-target-persen">{fmtPct(total.target_persen)}</td>
              <td className={`${td} font-bold text-amber-300`} data-testid="total-capaian-angka">{fmt(total.capaian_angka)}</td>
              <td className={`${td} font-bold text-amber-300`} data-testid="total-capaian-persen">{fmtPct(total.capaian_persen)}</td>
              <td className="px-3 py-3"><StatusPill capaian={total.capaian_persen} target={total.target_persen} targetAngka={total.target_angka} testid="total-status" /></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
