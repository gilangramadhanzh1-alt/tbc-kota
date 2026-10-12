import * as XLSX from "xlsx";
import { MONTHS_SHORT } from "@/lib/period";

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toUpperCase();

export function downloadInputTemplate({ indicatorName, year, unitLabel, rows, noTarget }) {
  const head = noTarget ? [unitLabel, ...MONTHS_SHORT] : [unitLabel, "Target Angka", "Target %", ...MONTHS_SHORT];
  const body = rows.map((r) => noTarget ? [r.unit_name, ...r.months] : r.luar_kota ? [r.unit_name, "", "", ...r.months] : [r.unit_name, r.target_angka, r.target_persen, ...r.months]);
  const ws = XLSX.utils.aoa_to_sheet([[`Template Input: ${indicatorName} · Tahun ${year}`], [`Jangan ubah nama ${unitLabel.toLowerCase()} di kolom pertama. Isi angka saja.`], [], head, ...body]);
  ws["!cols"] = [{ wch: 32 }, ...head.slice(1).map(() => ({ wch: 10 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Input");
  XLSX.writeFile(wb, `Template_${indicatorName.replace(/\s+/g, "_")}_${unitLabel}_${year}.xlsx`);
}

export async function parseInputExcel(file, rows) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  const hi = aoa.findIndex((r) => r.some((c) => norm(c) === "JAN"));
  if (hi < 0) throw new Error("Header bulan (Jan..Des) tidak ditemukan. Gunakan template yang disediakan.");
  const head = aoa[hi].map(norm);
  const col = (n) => head.indexOf(norm(n));
  const cT = col("Target Angka"), cP = col("Target %"), cM = MONTHS_SHORT.map(col);
  const byName = new Map(rows.map((r, i) => [norm(r.unit_name), i]));
  const num = (v) => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : null; };
  const next = rows.map((r) => ({ ...r, months: [...r.months] }));
  const unmatched = [];
  let matched = 0;
  for (const line of aoa.slice(hi + 1)) {
    const name = norm(line[0]);
    if (!name) continue;
    const i = byName.get(name) ?? byName.get(`KELURAHAN ${name}`);
    if (i === undefined) { unmatched.push(line[0]); continue; }
    matched++;
    if (!next[i].luar_kota) {
      if (cT >= 0 && num(line[cT]) !== null) next[i].target_angka = num(line[cT]);
      if (cP >= 0 && num(line[cP]) !== null) next[i].target_persen = num(line[cP]);
    }
    cM.forEach((c, m) => { if (c >= 0 && num(line[c]) !== null) next[i].months[m] = num(line[c]); });
  }
  return { rows: next, matched, unmatched };
}
