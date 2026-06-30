import { createContext, useContext, useEffect, useState } from "react";
import { api, clearToken, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = guest, obj = logged in
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (alive) setUser(res.data);
      })
      .catch(() => {
        if (alive) setUser(false);
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data?.token) setToken(res.data.token);
    setUser({ id: res.data.id, email: res.data.email, role: res.data.role });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed (clearing client state anyway):", err?.message || err);
    }
    clearToken();
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
