import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, errMsg } from "@/lib/api";

function UnitRow({ u, i, onSaved, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(u.name);
  const save = async () => {
    try { await api.put(`/units/${u.id}`, { name, type: u.type, order: u.order }); setEdit(false); onSaved(); toast.success("Nama diperbarui"); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50/70" data-testid={`unit-row-${i}`}>
      <span className="font-mono text-xs text-slate-400 w-6">{i + 1}</span>
      {edit ? <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1" data-testid={`unit-edit-input-${i}`} /> : <span className="flex-1 text-sm font-medium" data-testid={`unit-name-${i}`}>{u.name}</span>}
      {edit ? (
        <>
          <button onClick={save} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700" data-testid={`unit-save-${i}`}><Check className="h-4 w-4" /></button>
          <button onClick={() => { setEdit(false); setName(u.name); }} className="p-1.5 rounded hover:bg-slate-100" data-testid={`unit-cancel-${i}`}><X className="h-4 w-4" /></button>
        </>
      ) : (
        <>
          <button onClick={() => setEdit(true)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" data-testid={`unit-edit-${i}`}><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onDelete(u)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" data-testid={`unit-delete-${i}`}><Trash2 className="h-4 w-4" /></button>
        </>
      )}
    </li>
  );
}

export default function AdminMaster() {
  const [type, setType] = useState("kelurahan");
  const [units, setUnits] = useState([]);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const load = () => api.get("/units", { params: { type } }).then((r) => setUnits(r.data));
  useEffect(() => { load(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/units", { name, type, order: units.length }); setName(""); load(); toast.success("Data ditambahkan"); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async () => {
    try { await api.delete(`/units/${toDelete.id}`); toast.success("Data dihapus"); load(); }
    catch (e) { toast.error(errMsg(e)); }
    setToDelete(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Admin · Master Data</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">Kelurahan & Faskes</h1>
      </header>
      <Tabs value={type} onValueChange={setType}>
        <TabsList className="bg-slate-200/60">
          <TabsTrigger value="kelurahan" data-testid="master-tab-kelurahan">Kelurahan</TabsTrigger>
          <TabsTrigger value="faskes" data-testid="master-tab-faskes">Faskes</TabsTrigger>
        </TabsList>
      </Tabs>
      <form onSubmit={add} className="flex gap-2">
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "kelurahan" ? "KELURAHAN ..." : "Nama faskes"} className="h-10 bg-white" data-testid="master-add-input" />
        <button className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 whitespace-nowrap" data-testid="master-add-button"><Plus className="h-4 w-4" />Tambah</button>
      </form>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 text-xs text-slate-500" data-testid="master-count">{units.length} data</div>
        <ul>{units.map((u, i) => <UnitRow key={u.id} u={u} i={i} onSaved={load} onDelete={setToDelete} />)}</ul>
      </div>
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Semua target dan capaian milik data ini juga akan dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="master-delete-cancel">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="master-delete-confirm">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
