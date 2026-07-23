import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "./auth.api";
import { AuthContext } from "./auth-context";
import type { AuthUser } from "./types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadUser = useCallback(async () => {
    try {
      const result = await authApi.me();
      setUser(result.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void reloadUser().finally(() => setIsLoading(false));
  }, [reloadUser]);

  useEffect(() => {
    const handleExpiredSession = (): void => setUser(null);
    window.addEventListener("auth:session-expired", handleExpiredSession);
    return () => window.removeEventListener("auth:session-expired", handleExpiredSession);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    setUser(result.user);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login: handleLogin, logout: handleLogout, reloadUser }),
    [handleLogin, handleLogout, isLoading, reloadUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
