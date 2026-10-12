import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileSpreadsheet, Trash2, Upload, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AppContext";

const API = process.env.REACT_APP_BACKEND_URL;
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const Icon = ({ ct }) => (ct.includes("pdf") ? <FileText className="h-4 w-4 text-rose-600" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />);

export default function DocumentPanel({ indicator, year }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [ket, setKet] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => api.get("/documents", { params: { indicator, year } }).then((r) => setDocs(r.data));
  useEffect(() => { load(); }, [indicator, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file); fd.append("indicator", indicator); fd.append("year", year); fd.append("keterangan", ket);
    setUploading(true);
    try {
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Dokumen berhasil diunggah");
      setKet(""); load();
    } catch (err) { toast.error(errMsg(err)); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const remove = async (d) => {
    if (!window.confirm(`Hapus dokumen "${d.filename}"?`)) return;
    try { await api.delete(`/documents/${d.id}`); toast.success("Dokumen dihapus"); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5" data-testid="document-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2"><Paperclip className="h-4 w-4 text-amber-600" />Dokumen Pendukung</h2>
          <p className="text-xs text-slate-500 mt-0.5">Laporan PDF/Excel dari faskes · Tahun {year}</p>
        </div>
        {user && (
          <div className="flex flex-wrap items-center gap-2">
            <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Keterangan (opsional)" className="h-9 px-3 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none min-w-[200px]" data-testid="doc-keterangan-input" />
            <input ref={fileRef} type="file" accept=".pdf,.xls,.xlsx,.doc,.docx,.csv" className="hidden" onChange={upload} data-testid="doc-file-input" />
            <button onClick={() => fileRef.current.click()} disabled={uploading} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors" data-testid="btn-upload-doc">
              <Upload className="h-4 w-4" />{uploading ? "Mengunggah..." : "Unggah Dokumen"}
            </button>
          </div>
        )}
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg" data-testid="doc-empty">Belum ada dokumen pendukung untuk periode ini.</p>
      ) : (
        <ul className="divide-y divide-slate-100" data-testid="doc-list">
          {docs.map((d, i) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5" data-testid={`doc-item-${i}`}>
              <Icon ct={d.content_type} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate" data-testid={`doc-name-${i}`}>{d.filename}</div>
                <div className="text-[11px] text-slate-500 font-mono">{fmtSize(d.size)} · {new Date(d.created_at).toLocaleDateString("id-ID")}{d.keterangan ? ` · ${d.keterangan}` : ""}</div>
              </div>
              <a href={`${API}/api/documents/${d.id}/download`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium hover:border-slate-900 transition-colors" data-testid={`btn-download-doc-${i}`}>
                <Download className="h-3.5 w-3.5" />Unduh
              </a>
              {user && <button onClick={() => remove(d)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" data-testid={`btn-delete-doc-${i}`}><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
