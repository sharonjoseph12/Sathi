import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tok, type Me } from "./api";

type Ctx = {
  me: Me | null; pid: number; setPid: (n: number) => void;
  login: (email: string, pw: string) => Promise<string | null>;
  register: (b: object) => Promise<string | null>;
  logout: () => void; refresh: () => Promise<void>;
};
const C = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [pid, setPidState] = useState<number>(Number(localStorage.getItem("@sathi_pid") || 0));
  const setPid = (n: number) => { setPidState(n); localStorage.setItem("@sathi_pid", String(n)); };

  const refresh = async () => {
    if (!tok.get()) { setMe(null); return; }
    try {
      const m = await api.me();
      setMe(m);
      if (!pid && m.patients[0]) setPid(m.patients[0].id);
    } catch { tok.clear(); setMe(null); }
  };
  useEffect(() => { refresh(); }, []);

  const login = async (email: string, password: string) => {
    try {
      const r = await api.login({ email, password });
      tok.set(r.token); await refresh();
      return null;
    } catch (e) { return e instanceof Error ? e.message : "login failed"; }
  };
  const register = async (b: object) => {
    try {
      const r = await api.register(b);
      tok.set(r.token); await refresh();
      return null;
    } catch (e) { return e instanceof Error ? e.message : "signup failed"; }
  };
  const logout = () => { tok.clear(); setMe(null); location.hash = "#/login"; };

  return <C.Provider value={{ me, pid, setPid, login, register, logout, refresh }}>{children}</C.Provider>;
}

// Tiny hash router
import { useSyncExternalStore } from "react";
export function useHash() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); },
    () => location.hash || "#/home",
  );
}
export const go = (p: string) => { location.hash = p; };
