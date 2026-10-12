import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Activity, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AppContext";
import { errMsg } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try { await login(email, password); nav("/admin/input"); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#0F172A] text-white p-12 grain relative">
        <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-500 grid place-items-center"><Activity className="h-5 w-5 text-slate-900" /></div><span className="font-heading font-extrabold">DATA TBC KOTA SUKABUMI</span></div>
        <div>
          <div className="font-mono text-amber-400 text-xs tracking-widest">KOTA SUKABUMI</div>
          <h1 className="font-heading text-5xl font-extrabold tracking-tight mt-3 leading-[1.05]">Satu sumber data<br />untuk eliminasi TBC.</h1>
          <p className="text-slate-400 mt-4 max-w-md">Input target tahunan dan capaian bulanan kelurahan dan faskes. Rekap triwulan, semester dan tahunan dihitung otomatis.</p>
        </div>
        <div className="text-xs text-slate-500">Dinas Kesehatan Kota Sukabumi</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 rise" data-testid="login-form">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900" data-testid="login-back-link"><ArrowLeft className="h-4 w-4" />Kembali ke dashboard</Link>
          <div>
            <h2 className="font-heading text-2xl font-bold">Login Admin</h2>
            <p className="text-sm text-slate-500 mt-1">Hanya admin yang dapat menginput dan mengubah data.</p>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Email</label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" data-testid="login-email-input" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Password</label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" data-testid="login-password-input" /></div>
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>}
          <button disabled={loading} className="w-full h-11 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-60 transition-colors" data-testid="login-submit-button">{loading ? "Memproses..." : "Masuk"}</button>
        </form>
      </div>
    </div>
  );
}
