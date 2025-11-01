import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../services/auth";
import http from "../services/http";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // Chờ hydrate xong trước khi quyết định redirect ở RequireAuth
  const [ready, setReady] = useState(false);

  // Khôi phục user/token từ localStorage
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("auth_token") || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);

  // Gắn token vào axios headers nếu có + lưu vào localStorage
  useEffect(() => {
    if (token) {
      http.setToken?.(token);
      localStorage.setItem("auth_token", token);
    } else {
      http.clearToken?.();
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  // Lưu user vào localStorage khi thay đổi
  useEffect(() => {
    try {
      if (user) localStorage.setItem("auth_user", JSON.stringify(user));
      else localStorage.removeItem("auth_user");
    } catch(e) {
      console.log(e);
      
    }
  }, [user]);

  // Đánh dấu đã hydrate
  useEffect(() => {
    setReady(true);
  }, []);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("email", email);
      form.append("password", password);
      const { user, token } = await authApi.login(form);
      setUser(user);
      setToken(token);
      return { user, token };
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ fullname, email, password, avatarFile }) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("fullname", fullname);
      form.append("email", email);
      form.append("password", password);
      if (avatarFile) form.append("avatarFile", avatarFile);
      const { user, token } = await authApi.register(form);
      setUser(user);
      setToken(token);
      return { user, token };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken("");
  };

  const value = useMemo(
    () => ({ user, setUser, token, setToken, loading, login, register, logout, ready }),
    [user, token, loading, ready]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
