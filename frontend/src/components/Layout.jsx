import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { Activity, LayoutDashboard, PencilLine, Database, LogIn, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AppContext";

const linkCls = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`;

function Sidebar() {
  const { user, logout, indicators } = useAuth();
  const nav = useNavigate();
  return (
    <aside className="lg:w-72 lg:fixed lg:inset-y-0 bg-[#0F172A] text-white flex flex-col grain relative z-30" data-testid="sidebar">
      <Link to="/" className="px-6 py-6 flex items-center gap-3 border-b border-white/10" data-testid="nav-logo">
        <div className="h-10 w-10 rounded-lg bg-amber-500 grid place-items-center"><Activity className="h-5 w-5 text-slate-900" /></div>
        <div>
          <div className="font-heading font-extrabold tracking-tight leading-tight">DATA TBC KOTA SUKABUMI</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Kota Sukabumi</div>
        </div>
      </Link>
      <nav className="px-3 py-4 space-y-1 overflow-y-auto flex-1">
        <NavLink to="/" end className={linkCls} data-testid="nav-dashboard"><LayoutDashboard className="h-4 w-4" />Dashboard</NavLink>
        <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">Indikator</div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-0.5">
          {indicators.map((i) => (
            <NavLink key={i.id} to={`/indikator/${i.id}`} className={linkCls} data-testid={`nav-indicator-${i.id}`}>
              <span className="font-mono text-[11px] text-amber-400 w-5">{String(i.no).padStart(2, "0")}</span>
              <span className="truncate">{i.name}</span>
            </NavLink>
          ))}
        </div>
        {user && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">Admin</div>
            <NavLink to="/admin/input" className={linkCls} data-testid="nav-admin-input"><PencilLine className="h-4 w-4" />Input Data</NavLink>
            <NavLink to="/admin/master" className={linkCls} data-testid="nav-admin-master"><Database className="h-4 w-4" />Kelurahan & Faskes</NavLink>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-white/10">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs truncate"><div className="text-slate-400">Masuk sebagai</div><div className="truncate" data-testid="current-user-email">{user.email}</div></div>
            <button onClick={async () => { await logout(); nav("/"); }} className="p-2 rounded-lg hover:bg-white/10" data-testid="logout-button" title="Keluar"><LogOut className="h-4 w-4" /></button>
          </div>
        ) : (
          <Link to="/login" className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors" data-testid="admin-login-button">
            <span className="flex items-center gap-2"><LogIn className="h-4 w-4" />Login Admin</span><ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </aside>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-72">
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1500px]"><Outlet /></div>
      </main>
    </div>
  );
}
