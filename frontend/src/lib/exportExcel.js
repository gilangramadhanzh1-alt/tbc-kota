import * as XLSX from "xlsx";

export function exportReportExcel({ indicator, unitLabel, period, rows, total }) {
  const header = [
    ["BANK DATA TUBERKULOSIS KOTA SUKABUMI"],
    [`Indikator: ${indicator.no}. ${indicator.name}`],
    [`Periode: ${period}`, "", `Per ${unitLabel}`],
    [],
    ["No", unitLabel, "Target Tahunan", "Target Angka (Periode)", "Target %", "Capaian Angka", "Capaian %", "Status"],
  ];
  const body = rows.map((r, i) => [i + 1, r.unit_name, r.target_tahunan, r.target_angka, r.target_persen, r.capaian_angka, r.capaian_persen, r.target_angka ? (r.tercapai ? "Tercapai" : "Belum Tercapai") : "-"]);
  const foot = [["", "TOTAL CAPAIAN", total.target_tahunan, total.target_angka, total.target_persen, total.capaian_angka, total.capaian_persen, total.tercapai ? "Tercapai" : "Belum Tercapai"]];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...body, ...foot]);
  ws["!cols"] = [{ wch: 5 }, { wch: 34 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, unitLabel.slice(0, 30));
  XLSX.writeFile(wb, `TBC_${indicator.code}_${unitLabel}_${period.replace(/\s+/g, "_")}.xlsx`);
}

export function exportSummaryExcel({ data, period, unitLabel }) {
  const aoa = [
    ["BANK DATA TUBERKULOSIS KOTA SUKABUMI - REKAP INDIKATOR"],
    [`Periode: ${period}`, "", `Basis: Per ${unitLabel}`],
    [],
    ["No", "Indikator", "Target Angka", "Target %", "Total Capaian Angka", "Total Capaian %", "Status"],
    ...data.map((d) => [d.no, d.name, d.target_angka, d.target_persen, d.capaian_angka, d.capaian_persen, d.target_angka ? (d.tercapai ? "Tercapai" : "Belum Tercapai") : "-"]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 5 }, { wch: 36 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap");
  XLSX.writeFile(wb, `TBC_Rekap_${unitLabel}_${period.replace(/\s+/g, "_")}.xlsx`);
}
