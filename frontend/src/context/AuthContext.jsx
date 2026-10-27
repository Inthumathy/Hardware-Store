
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { loginUser, getProfile } from "../services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const result = await getProfile(token);

        if (active) {
          setUser(result.user);
        }
      } catch {
        localStorage.removeItem("token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const result = await loginUser(email, password);

    if (!result.token || !result.user) {
      throw new Error("Invalid login response");
    }

    localStorage.setItem("token", result.token);
    setUser(result.user);

    return result.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
