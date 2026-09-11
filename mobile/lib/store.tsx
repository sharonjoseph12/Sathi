/**
 * App context provider for React Native.
 * Mirrors frontend/src/lib/store.tsx.
 * All token operations are async (SecureStore).
 */

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, tok, type Me, type PatientRef } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type AdaptiveProfileRaw,
  loadAdaptiveProfileRaw,
  saveAdaptiveProfileRaw,
} from "./useAdaptiveProfile";

type Ctx = {
  me: Me | null;
  pid: number;
  setPid: (n: number) => void;
  login: (email: string, pw: string) => Promise<string | null>;
  register: (b: object) => Promise<string | null>;
  logout: () => void;
  refresh: () => Promise<void>;
  loading: boolean;
  adaptiveRaw: AdaptiveProfileRaw;
  setAdaptiveProfile: (raw: AdaptiveProfileRaw) => void;
};

const DEFAULT_RAW: AdaptiveProfileRaw = {
  ageBand: "adult",
  digitalLiteracy: "medium",
  urgencyLevel: "normal",
  accessibilityFlags: [],
};

const C = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [pid, setPidState] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [adaptiveRaw, setAdaptiveRawState] = useState<AdaptiveProfileRaw>(DEFAULT_RAW);

  const setPid = useCallback(async (n: number) => {
    setPidState(n);
    await AsyncStorage.setItem("@sathi_pid", String(n));
  }, []);

  const setAdaptiveProfile = useCallback((raw: AdaptiveProfileRaw) => {
    saveAdaptiveProfileRaw(raw);
    setAdaptiveRawState(raw);
  }, []);

  const refresh = useCallback(async () => {
    const t = await tok.get();
    if (!t) { setMe(null); setLoading(false); return; }
    try {
      const m = await api.me();
      setMe(m);
      if (!pid && m.patients[0]) {
        setPidState(m.patients[0].id);
        await AsyncStorage.setItem("@sathi_pid", String(m.patients[0].id));
      }
    } catch {
      await tok.clear();
      setMe(null);
    }
    setLoading(false);
  }, [pid]);

  // Load stored pid and adaptive profile on mount
  useEffect(() => {
    (async () => {
      try {
        const storedPid = await AsyncStorage.getItem("@sathi_pid");
        if (storedPid) setPidState(Number(storedPid));
      } catch { /* noop */ }
      const raw = await loadAdaptiveProfileRaw();
      setAdaptiveRawState(raw);
      await refresh();
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const r = await api.login({ email, password });
      await tok.set(r.token);
      await refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "login failed";
    }
  }, [refresh]);

  const register = useCallback(async (b: object): Promise<string | null> => {
    try {
      const r = await api.register(b);
      await tok.set(r.token);
      await refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "signup failed";
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    await tok.clear();
    setMe(null);
  }, []);

  return (
    <C.Provider value={{ me, pid, setPid, login, register, logout, refresh, loading, adaptiveRaw, setAdaptiveProfile }}>
      {children}
    </C.Provider>
  );
}
