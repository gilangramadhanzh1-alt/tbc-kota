import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);
const FilterCtx = createContext(null);

export function AppProviders({ children }) {
  const [user, setUser] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [filter, setFilterState] = useState({ year: new Date().getFullYear(), periodType: "tahunan", periodIndex: 1, unitType: "kelurahan" });

  useEffect(() => {
    api.get("/indicators").then((r) => setIndicators(r.data));
    if (!localStorage.getItem("tbc_token")) return setUser(false);
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => { localStorage.removeItem("tbc_token"); setUser(false); });
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("tbc_token", data.token);
    setUser(data.user);
  };
  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("tbc_token");
    setUser(false);
  };
  const setFilter = (patch) => setFilterState((f) => ({ ...f, ...patch }));

  return (
    <AuthCtx.Provider value={{ user, login, logout, indicators }}>
      <FilterCtx.Provider value={{ filter, setFilter }}>{children}</FilterCtx.Provider>
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
export const useFilter = () => useContext(FilterCtx);
