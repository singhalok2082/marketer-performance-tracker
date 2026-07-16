import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    const handler = () => { setUser(null); };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [fetchMe]);

  // Heartbeat every 5 minutes to track usage
  useEffect(() => {
    if (!user) return;
    let minutesActive = 0;
    const tick = setInterval(() => {
      minutesActive += 1;
      if (minutesActive % 5 === 0) {
        api.post("/auth/heartbeat", { minutesActive: 5 }).catch(() => {});
        minutesActive = 0;
      }
    }, 60 * 1000);
    return () => clearInterval(tick);
  }, [user?.id]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
