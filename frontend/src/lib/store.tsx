import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, tok, type Me } from "./api";
import {
  type AdaptiveProfileRaw,
  loadAdaptiveProfileRaw,
  saveAdaptiveProfileRaw,
} from "./useAdaptiveProfile";

type Ctx = {
  me: Me | null; pid: number; setPid: (n: number) => void;
  login: (email: string, pw: string, sessionOnly?: boolean) => Promise<string | null>;
  register: (b: object) => Promise<string | null>;
  logout: () => void; refresh: () => Promise<void>;
  /** Raw adaptive profile fields — update via setAdaptiveProfile */
  adaptiveRaw: AdaptiveProfileRaw;
  /** Persist adaptive profile and trigger re-render across the app */
  setAdaptiveProfile: (raw: AdaptiveProfileRaw) => void;
};
const C = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [pid, setPidState] = useState<number>(() => {
    try {
      return Number(sessionStorage.getItem("@sathi_pid") || localStorage.getItem("@sathi_pid") || 0);
    } catch {
      return 0;
    }
  });
  const setPid = (n: number) => { 
    setPidState(n); 
    try {
      sessionStorage.setItem("@sathi_pid", String(n));
      localStorage.setItem("@sathi_pid", String(n));
    } catch { /* ignore */ }
  };

  // Adaptive profile raw state — loaded from localStorage on mount
  const [adaptiveRaw, setAdaptiveRawState] = useState<AdaptiveProfileRaw>(loadAdaptiveProfileRaw);
  const setAdaptiveProfile = useCallback((raw: AdaptiveProfileRaw) => {
    saveAdaptiveProfileRaw(raw);
    setAdaptiveRawState(raw);
    window.dispatchEvent(new CustomEvent("sathi-adaptive-change", { detail: raw }));
  }, []);

  const refresh = async () => {
    if (!tok.get()) { setMe(null); return; }
    try {
      const m = await api.me();
      setMe(m);
      if (!pid && m.patients[0]) setPid(m.patients[0].id);
    } catch { tok.clear(); setMe(null); }
  };
  useEffect(() => { refresh(); }, []);

  const login = async (email: string, password: string, sessionOnly = false) => {
    try {
      const r = await api.login({ email, password });
      tok.set(r.token, sessionOnly);
      const m = await api.me();
      setMe(m);
      if (m.patients[0]) {
        setPid(m.patients[0].id);
      }
      return null;
    } catch (e) {
      tok.clear();
      setMe(null);
      return e instanceof Error ? e.message : "login failed";
    }
  };
  const register = async (b: object) => {
    try {
      const r = await api.register(b);
      tok.set(r.token);
      const m = await api.me();
      setMe(m);
      if (!pid && m.patients[0]) setPid(m.patients[0].id);
      return null;
    } catch (e) {
      tok.clear();
      setMe(null);
      return e instanceof Error ? e.message : "signup failed";
    }
  };
  const logout = () => { tok.clear(); setMe(null); location.hash = "#/login"; };

  return <C.Provider value={{ me, pid, setPid, login, register, logout, refresh, adaptiveRaw, setAdaptiveProfile }}>{children}</C.Provider>;
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
