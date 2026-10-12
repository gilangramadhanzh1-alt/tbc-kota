export const KECAMATAN = [
  { name: "Baros", kel: ["BAROS", "JAYAKARSA", "JAYA MEKAR", "SUDAJAYA HILIR"] },
  { name: "Lembursitu", kel: ["LEMBURSITU", "SITU MEKAR", "CIPANENGAH", "CIKUNDUL", "SINDANG SARI"] },
  { name: "Cibeureum", kel: ["BABAKAN", "CIBEUREUM HILIR", "SINDANG PALAY", "LIMUSNUNGGAL"] },
  { name: "Citamiang", kel: ["CITAMIANG", "TIPAR", "GEDONG PANJANG", "NANGGELENG", "CIKONDANG"] },
  { name: "Warudoyong", kel: ["WARUDOYONG", "NYOMPLONG", "DAYEUHLUHUR", "SUKAKARYA", "BENTENG"] },
  { name: "Gunung Puyuh", kel: ["GUNUNG PUYUH", "KARAMAT", "SRIWIDARI", "KARANG TENGAH"] },
  { name: "Cikole", kel: ["CIKOLE", "GUNUNG PARANG", "KEBONJATI", "CISARUA", "SELABATU", "SUBANGJAYA"] },
];

export const kelKey = (name) => name.replace(/^KELURAHAN\s+/i, "").replace(/\s+/g, " ").trim().toUpperCase();

export function heatColor(v, max) {
  if (!v) return "#F1F5F9";
  const t = Math.min(1, v / (max || 1));
  const stops = ["#FEF3C7", "#FCD34D", "#F59E0B", "#DC2626", "#7F1D1D"];
  return stops[Math.min(stops.length - 1, Math.floor(t * stops.length))];
}
