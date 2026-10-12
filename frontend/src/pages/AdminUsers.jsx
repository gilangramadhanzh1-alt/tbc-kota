import { useEffect, useState } from "react";
import { UserPlus, Trash2, ShieldCheck, ShieldOff, KeyRound, Crown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AppContext";

function AdminRow({ a, i, me, onChange, onDelete }) {
  const toggle = async () => {
    try { const r = await api.patch(`/admins/${a.id}/active`); toast.success(r.data.is_active ? "Admin diaktifkan" : "Admin dinonaktifkan"); onChange(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const self = a.id === me?.id;
  return (
    <li className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 ${a.is_active ? "" : "opacity-60"}`} data-testid={`admin-row-${i}`}>
      <div className={`h-9 w-9 rounded-full grid place-items-center font-heading font-bold text-sm ${a.is_owner ? "bg-amber-400 text-slate-900" : "bg-slate-200 text-slate-700"}`}>{(a.name || a.email)[0].toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium flex items-center gap-2" data-testid={`admin-name-${i}`}>{a.name}{a.is_owner && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-700"><Crown className="h-3 w-3" />Utama</span>}{self && <span className="text-[10px] uppercase tracking-wider text-slate-400">Anda</span>}</div>
        <div className="text-xs text-slate-500 font-mono truncate" data-testid={`admin-email-${i}`}>{a.email}</div>
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`} data-testid={`admin-status-${i}`}>{a.is_active ? "Aktif" : "Nonaktif"}</span>
      {!a.is_owner && !self && (
        <>
          <button onClick={toggle} title={a.is_active ? "Nonaktifkan" : "Aktifkan"} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" data-testid={`admin-toggle-${i}`}>{a.is_active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</button>
          <button onClick={() => onDelete(a)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" data-testid={`admin-delete-${i}`}><Trash2 className="h-4 w-4" /></button>
        </>
      )}
    </li>
  );
}

function ChangePassword() {
  const [f, setF] = useState({ old_password: "", new_password: "", confirm: "" });
  const submit = async (e) => {
    e.preventDefault();
    if (f.new_password !== f.confirm) { toast.error("Konfirmasi password tidak sama"); return; }
    try { await api.put("/auth/password", { old_password: f.old_password, new_password: f.new_password }); toast.success("Password berhasil diubah"); setF({ old_password: "", new_password: "", confirm: "" }); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3" data-testid="change-password-form">
      <h2 className="font-heading font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-600" />Ubah Password Saya</h2>
      <div className="grid sm:grid-cols-3 gap-2">
        <Input type="password" required placeholder="Password lama" value={f.old_password} onChange={(e) => setF({ ...f, old_password: e.target.value })} data-testid="pw-old-input" />
        <Input type="password" required minLength={8} placeholder="Password baru (min. 8)" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} data-testid="pw-new-input" />
        <Input type="password" required placeholder="Ulangi password baru" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} data-testid="pw-confirm-input" />
      </div>
      <button className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800" data-testid="pw-submit-button">Simpan Password</button>
    </form>
  );
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [toDelete, setToDelete] = useState(null);

  const load = () => api.get("/admins").then((r) => setAdmins(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/admins", f); toast.success(`Admin ${f.email} ditambahkan`); setF({ name: "", email: "", password: "" }); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async () => {
    try { await api.delete(`/admins/${toDelete.id}`); toast.success("Admin dihapus"); load(); } catch (e) { toast.error(errMsg(e)); }
    setToDelete(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">Admin · Pengguna</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">Kelola Admin</h1>
        <p className="text-sm text-slate-500 mt-1">Daftarkan admin tambahan yang dapat menginput dan mengubah data.</p>
      </header>
      <form onSubmit={add} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3" data-testid="add-admin-form">
        <h2 className="font-heading font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-amber-600" />Tambah Admin Baru</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <Input required placeholder="Nama" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="admin-name-input" />
          <Input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="admin-email-input" />
          <Input required type="password" minLength={8} placeholder="Password (min. 8 karakter)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="admin-password-input" />
        </div>
        <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800" data-testid="admin-add-button"><UserPlus className="h-4 w-4" />Daftarkan Admin</button>
      </form>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 text-xs text-slate-500" data-testid="admin-count">{admins.length} admin terdaftar</div>
        <ul>{admins.map((a, i) => <AdminRow key={a.id} a={a} i={i} me={user} onChange={load} onDelete={setToDelete} />)}</ul>
      </div>
      <ChangePassword />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus admin {toDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>Akun ini tidak akan bisa login lagi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="admin-delete-cancel">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="admin-delete-confirm">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
