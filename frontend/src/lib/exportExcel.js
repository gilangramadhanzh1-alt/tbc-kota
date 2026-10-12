import * as XLSX from "xlsx";

export function exportReportExcel({ indicator, unitLabel, period, rows, total, noTarget = false }) {
  const header = [
    ["DATA TBC KOTA SUKABUMI"],
    [`Indikator: ${indicator.no}. ${indicator.name}`],
    [`Periode: ${period}`, "", `Per ${unitLabel}`],
    [],
    noTarget ? ["No", unitLabel, "Capaian Angka"] : ["No", unitLabel, "Target Tahunan", "Target Angka (Periode)", "Target %", "Capaian Angka", "Capaian %", "Status"],
  ];
  const body = rows.map((r, i) => noTarget ? [i + 1, r.unit_name, r.capaian_angka] : [i + 1, r.unit_name, r.target_tahunan, r.target_angka, r.target_persen, r.capaian_angka, r.capaian_persen, r.target_angka ? (r.tercapai ? "Tercapai" : "Belum Tercapai") : "-"]);
  const foot = [noTarget ? ["", "TOTAL CAPAIAN", total.capaian_angka] : ["", "TARGET KOTA / TOTAL CAPAIAN", total.target_tahunan, total.target_angka, total.target_persen, total.capaian_angka, total.capaian_persen, total.tercapai ? "Tercapai" : "Belum Tercapai"]];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...body, ...foot]);
  ws["!cols"] = [{ wch: 5 }, { wch: 34 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, unitLabel.slice(0, 30));
  XLSX.writeFile(wb, `TBC_${indicator.code}_${unitLabel}_${period.replace(/\s+/g, "_")}.xlsx`);
}

export function exportSummaryExcel({ data, period, unitLabel, noTarget = false, year = "" }) {
  const aoa = [
    ["DATA TBC KOTA SUKABUMI - REKAP INDIKATOR"],
    [`Periode: ${period}`, "", `Basis: Per ${unitLabel}`],
    [],
    noTarget ? ["No", "Indikator", "Total Capaian Angka"] : ["No", "Indikator", `Target Kota ${year} (Tahunan)`, "Target Angka (Periode)", "Target %", "Total Capaian Angka", "Total Capaian %", "Status"],
    ...data.map((d) => noTarget ? [d.no, d.name, d.capaian_angka] : [d.no, d.name, d.target_tahunan, d.target_angka, d.target_persen, d.capaian_angka, d.capaian_persen, d.target_angka ? (d.tercapai ? "Tercapai" : "Belum Tercapai") : "-"]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 5 }, { wch: 36 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap");
  XLSX.writeFile(wb, `TBC_Rekap_${unitLabel}_${period.replace(/\s+/g, "_")}.xlsx`);
}
