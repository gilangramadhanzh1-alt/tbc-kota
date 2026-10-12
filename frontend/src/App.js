import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders, useAuth } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import IndicatorDetail from "@/pages/IndicatorDetail";
import PetaKelurahan from "@/pages/PetaKelurahan";
import AdminUsers from "@/pages/AdminUsers";
import Login from "@/pages/Login";
import AdminInput from "@/pages/AdminInput";
import AdminMaster from "@/pages/AdminMaster";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-slate-500" data-testid="auth-loading">Memeriksa sesi...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/indikator/:id" element={<IndicatorDetail />} />
              <Route path="/peta" element={<PetaKelurahan />} />
              <Route path="/admin/input" element={<Protected><AdminInput /></Protected>} />
              <Route path="/admin/master" element={<Protected><AdminMaster /></Protected>} />
              <Route path="/admin/users" element={<Protected><AdminUsers /></Protected>} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AppProviders>
    </div>
  );
}

export default App;
